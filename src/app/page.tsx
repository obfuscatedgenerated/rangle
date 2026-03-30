import {Suspense} from "react";
import {HomeInteraction} from "@/components/HomeInteraction";

export default function Home() {
    return (
      <>
          <noscript>Please enable JavaScript to play Rangle!</noscript>
          <Suspense fallback={"Loading..."}>
              <HomeInteraction />
          </Suspense>
      </>
    );
}
