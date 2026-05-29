import { Suspense } from "react";
import { CVsPage } from "@/components/cvs-page";

export default function CVsRoute() {
  return (
    <Suspense>
      <CVsPage />
    </Suspense>
  );
}
