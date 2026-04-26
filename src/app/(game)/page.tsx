import {Suspense} from "react";

import {HomeInteraction} from "@/app/(game)/HomeInteraction";
import {LoadingSpinner} from "@/components/ui/LoadingSpinner";

export default function Home() {
    return (
      <>
          <Suspense fallback={<LoadingSpinner className="m-auto" />}>
              <HomeInteraction />
          </Suspense>
      </>
    );
}
