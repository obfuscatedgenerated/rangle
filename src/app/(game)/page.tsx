import {Suspense} from "react";

import {HomeInteraction} from "@/components/HomeInteraction";
import {LoadingSpinner} from "@/components/LoadingSpinner";

export default function Home() {
    return (
      <>
          <Suspense fallback={<LoadingSpinner className="m-auto" />}>
              <HomeInteraction />
          </Suspense>
      </>
    );
}
