
CREATE OR REPLACE FUNCTION public.block_platform_admin_entity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _email text;
BEGIN
  IF NEW.profile_id IS NULL THEN RETURN NEW; END IF;
  SELECT lower(email) INTO _email FROM public.profiles WHERE id = NEW.profile_id;
  IF _email = 'princelaw4u.pl@gmail.com' THEN
    RAISE EXCEPTION 'princelaw4u.pl@gmail.com is the platform super admin and cannot be a teacher, parent, student, or join a school';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  price numeric(12,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_products_read_school" ON public.shop_products FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.is_school_admin(auth.uid(), public.shop_products.school_id)
    OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.profile_id=auth.uid() AND t.school_org_id=public.shop_products.school_id)
    OR EXISTS (SELECT 1 FROM public.parents p  WHERE p.profile_id=auth.uid() AND p.school_org_id=public.shop_products.school_id)
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.profile_id=auth.uid() AND s.school_org_id=public.shop_products.school_id)
  );
CREATE POLICY "shop_products_admin_write" ON public.shop_products FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.is_school_admin(auth.uid(), public.shop_products.school_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.is_school_admin(auth.uid(), public.shop_products.school_id));
CREATE TRIGGER trg_shop_products_updated BEFORE UPDATE ON public.shop_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_orders_read" ON public.shop_orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_school_admin(auth.uid(), public.shop_orders.school_id));
CREATE POLICY "shop_orders_insert_own" ON public.shop_orders FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "shop_orders_admin_update" ON public.shop_orders FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.is_school_admin(auth.uid(), public.shop_orders.school_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.is_school_admin(auth.uid(), public.shop_orders.school_id));
CREATE TRIGGER trg_shop_orders_updated BEFORE UPDATE ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shop_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.shop_products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_order_items TO authenticated;
GRANT ALL ON public.shop_order_items TO service_role;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_items_read" ON public.shop_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shop_orders o WHERE o.id=public.shop_order_items.order_id
    AND (o.buyer_id=auth.uid() OR public.is_platform_admin(auth.uid()) OR public.is_school_admin(auth.uid(), o.school_id))));
CREATE POLICY "shop_items_insert" ON public.shop_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.shop_orders o WHERE o.id=public.shop_order_items.order_id AND o.buyer_id=auth.uid()));
