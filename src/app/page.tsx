import {Suspense} from "react";
import {HomeInteraction} from "@/components/HomeInteraction";
import {LoadingSpinner} from "@/components/LoadingSpinner";

export default function Home() {
    return (
      <>
          <noscript className="absolute top-1/4 left-1/2 -translate-x-1/2">Please enable JavaScript to play Rangle!</noscript>
          <Suspense fallback={<LoadingSpinner className="m-auto" />}>
              <HomeInteraction />
          </Suspense>
      </>
    );
}
