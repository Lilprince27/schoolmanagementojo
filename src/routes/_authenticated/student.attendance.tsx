import { createFileRoute } from "@tanstack/react-router";
import { StudentSelf } from "./student.results";

export const Route = createFileRoute("/_authenticated/student/attendance")({
  component: () => <StudentSelf kind="attendance" />,
});
