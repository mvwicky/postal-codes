import { Head } from "~/deps.ts";
import Info from "~/islands/Info.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>Postal Codes</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <p class="my-6">Postal Codes</p>
        <Info start={0} />
      </div>
    </>
  );
}
