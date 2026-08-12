import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { useMembership } from "@/lib/hooks/use-membership";
import { usePay } from "@/lib/hooks/use-pay";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Plus, Trash2, Package, ShoppingCart, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/shop")({ component: Shop });

const CATEGORIES = ["uniform", "books", "sport", "lab", "badges", "accessories", "other"];

function Shop() {
  const { user } = useSession();
  const { data: membership, isLoading } = useMembership(user?.id, user?.email);
  const isAdmin = !!membership?.isSchoolAdmin || !!membership?.isPlatformAdmin;
  const schoolId = membership?.schoolId ?? null;

  if (isLoading || !membership) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="h-52 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!schoolId) {
    return (
      <p className="text-muted-foreground">
        {membership.isPlatformAdmin
          ? "Open a school from the Schools area to manage its shop."
          : "You have not been assigned to a school yet. Please contact your school administrator."}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2"><ShoppingBag /> School Shop</h1>
        <p className="text-sm text-muted-foreground">Uniforms, books, sport gear, lab items and more.</p>
      </div>
      <Tabs defaultValue="browse">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="browse"><Package className="h-4 w-4 mr-1" /> Browse</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1" /> My Orders</TabsTrigger>
          {isAdmin && <TabsTrigger value="manage">Manage products</TabsTrigger>}
          {isAdmin && <TabsTrigger value="all-orders">All orders</TabsTrigger>}
        </TabsList>


        <TabsContent value="browse"><BrowseTab schoolId={schoolId} userId={user!.id} /></TabsContent>
        <TabsContent value="orders"><MyOrdersTab userId={user!.id} /></TabsContent>
        {isAdmin && <TabsContent value="manage"><ManageTab schoolId={schoolId} userId={user!.id} /></TabsContent>}
        {isAdmin && <TabsContent value="all-orders"><AllOrdersTab schoolId={schoolId} /></TabsContent>}
      </Tabs>
    </div>
  );
}

function BrowseTab({ schoolId, userId }: { schoolId: string; userId: string }) {
  const qc = useQueryClient();
  const { pay } = usePay();
  const [cat, setCat] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["shop-products", schoolId],
    queryFn: async () => (await supabase.from("shop_products").select("*").eq("school_id", schoolId).eq("is_active", true).order("name")).data ?? [],
  });

  const filtered = (products ?? []).filter((p: any) => cat === "all" || p.category === cat);
  const cartItems = Object.entries(cart).filter(([, q]) => q > 0);
  const total = cartItems.reduce((s, [id, q]) => {
    const p = products?.find((x: any) => x.id === id);
    return s + (p ? Number(p.price) * q : 0);
  }, 0);

  async function checkout(payNow: boolean) {
    if (cartItems.length === 0) return toast.error("Cart is empty");
    setPlacing(true);
    const { data: order, error } = await supabase.from("shop_orders").insert({
      school_id: schoolId, buyer_id: userId, total, status: "pending",
    }).select().single();
    if (error || !order) { setPlacing(false); return toast.error(error?.message || "Order failed"); }
    const items = cartItems.map(([product_id, quantity]) => {
      const p = products!.find((x: any) => x.id === product_id)!;
      return { order_id: order.id, product_id, quantity, unit_price: p.price };
    });
    const { error: e2 } = await supabase.from("shop_order_items").insert(items);
    if (e2) { setPlacing(false); return toast.error(e2.message); }
    setCart({});
    qc.invalidateQueries({ queryKey: ["shop-orders"] });
    if (payNow) {
      await pay({ purpose: "shop", order_id: order.id });
      return;
    }
    setPlacing(false);
    toast.success("Order placed! You can pay from My Orders.");
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
        {CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p: any) => (
          <div key={p.id} className="card-soft p-4 flex flex-col gap-3">
            {p.image_url && <img src={p.image_url} alt={p.name} className="h-40 w-full object-cover rounded-md" />}
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{p.category} · Stock: {p.stock}</div>
              {p.description && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</div>}
            </div>
            <div className="flex items-center justify-between mt-auto">
              <div className="font-bold">₦{Number(p.price).toLocaleString()}</div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setCart({ ...cart, [p.id]: Math.max(0, (cart[p.id] ?? 0) - 1) })}>-</Button>
                <span className="w-8 text-center text-sm">{cart[p.id] ?? 0}</span>
                <Button size="sm" onClick={() => setCart({ ...cart, [p.id]: Math.min(p.stock, (cart[p.id] ?? 0) + 1) })}>+</Button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No products available.</p>}
      </div>

      {cartItems.length > 0 && (
        <div className="card-soft p-4 sticky bottom-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm text-muted-foreground">{cartItems.length} item(s) · Total</div>
            <div className="text-2xl font-extrabold">₦{total.toLocaleString()}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={placing} onClick={() => checkout(false)}>
              <ShoppingCart className="h-4 w-4 mr-1" /> Place order
            </Button>
            <Button disabled={placing} onClick={() => checkout(true)}>
              {placing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1" />} Pay now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize ${active ? "bg-primary text-primary-foreground border-transparent" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
      {children}
    </button>
  );
}

function MyOrdersTab({ userId }: { userId: string }) {
  const { pay, isPending } = usePay();
  const { data: orders } = useQuery({
    queryKey: ["shop-orders", "mine", userId],
    queryFn: async () => (await supabase.from("shop_orders")
      .select("*, shop_order_items(*, shop_products(name))")
      .eq("buyer_id", userId).order("created_at", { ascending: false })).data ?? [],
  });
  if (!orders || orders.length === 0) return <p className="text-muted-foreground py-8 text-center">No orders yet.</p>;
  return (
    <div className="space-y-3">
      {orders.map((o: any) => (
        <div key={o.id} className="card-soft p-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <div>
              <div className="font-semibold">Order #{o.id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${o.payment_status === "paid" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}`}>
                {o.payment_status === "paid" ? "paid" : "unpaid"}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${o.status === "pending" ? "bg-warning text-warning-foreground" : o.status === "completed" ? "bg-success text-success-foreground" : "bg-muted"}`}>{o.status}</span>
            </div>
          </div>
          <ul className="text-sm mt-2 space-y-1">
            {o.shop_order_items?.map((it: any) => (
              <li key={it.id} className="flex justify-between">
                <span>{it.shop_products?.name} × {it.quantity}</span>
                <span>₦{(Number(it.unit_price) * it.quantity).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
            <div className="font-bold">Total: ₦{Number(o.total).toLocaleString()}</div>
            {o.payment_status !== "paid" && o.status !== "cancelled" && (
              <Button size="sm" disabled={isPending(o.id)} onClick={() => pay({ purpose: "shop", order_id: o.id })}>
                {isPending(o.id) ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1" />} Pay now
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ManageTab({ schoolId, userId }: { schoolId: string; userId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "", category: "uniform", price: "", stock: "", image_url: "" });

  const { data: products } = useQuery({
    queryKey: ["shop-products-manage", schoolId],
    queryFn: async () => (await supabase.from("shop_products").select("*").eq("school_id", schoolId).order("created_at", { ascending: false })).data ?? [],
  });

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image_url: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function add() {
    if (!form.name || !form.price) return toast.error("Name and price required");
    const { error } = await supabase.from("shop_products").insert({
      school_id: schoolId, name: form.name, description: form.description, category: form.category,
      price: Number(form.price), stock: Number(form.stock || 0), image_url: form.image_url || null, created_by: userId,
    });
    if (error) return toast.error(error.message);
    toast.success("Product added");
    setForm({ name: "", description: "", category: "uniform", price: "", stock: "", image_url: "" });
    qc.invalidateQueries({ queryKey: ["shop-products-manage", schoolId] });
    qc.invalidateQueries({ queryKey: ["shop-products", schoolId] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("shop_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["shop-products-manage", schoolId] });
    qc.invalidateQueries({ queryKey: ["shop-products", schoolId] });
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from("shop_products").update({ is_active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["shop-products-manage", schoolId] });
    qc.invalidateQueries({ queryKey: ["shop-products", schoolId] });
  }

  return (
    <div className="space-y-6">
      <div className="card-soft p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Add product</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Category</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><Label>Price (₦)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Label>Image</Label>
            <Input type="file" accept="image/*" onChange={onImage} />
            {form.image_url && <img src={form.image_url} alt="" className="h-24 mt-2 rounded object-cover" />}
          </div>
        </div>
        <Button onClick={add}>Add product</Button>
      </div>

      <div className="space-y-2">
        {products?.map((p: any) => (
          <div key={p.id} className="card-soft p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {p.image_url && <img src={p.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{p.category} · ₦{Number(p.price).toLocaleString()} · Stock {p.stock}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggle(p.id, p.is_active)}>{p.is_active ? "Hide" : "Show"}</Button>
              <Button size="sm" variant="destructive" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {products?.length === 0 && <p className="text-muted-foreground text-center py-6">No products yet.</p>}
      </div>
    </div>
  );
}

function AllOrdersTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const { data: orders } = useQuery({
    queryKey: ["shop-orders", "all", schoolId],
    queryFn: async () => (await supabase.from("shop_orders")
      .select("*, profiles:buyer_id(full_name, email), shop_order_items(*, shop_products(name))")
      .eq("school_id", schoolId).order("created_at", { ascending: false })).data ?? [],
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("shop_orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["shop-orders", "all", schoolId] });
  }

  if (!orders || orders.length === 0) return <p className="text-muted-foreground py-8 text-center">No orders yet.</p>;
  return (
    <div className="space-y-3">
      {orders.map((o: any) => (
        <div key={o.id} className="card-soft p-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <div className="font-semibold">{o.profiles?.full_name || o.profiles?.email}</div>
              <div className="text-xs text-muted-foreground">Order #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}</div>
            </div>
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
              <option value="pending">pending</option>
              <option value="processing">processing</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
          <ul className="text-sm mt-2 space-y-1">
            {o.shop_order_items?.map((it: any) => (
              <li key={it.id} className="flex justify-between">
                <span>{it.shop_products?.name} × {it.quantity}</span>
                <span>₦{(Number(it.unit_price) * it.quantity).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <div className="text-right font-bold mt-2">Total: ₦{Number(o.total).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
