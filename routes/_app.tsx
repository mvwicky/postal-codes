import { Head, type AppProps } from "~/deps.ts";

export default function App({ Component }: AppProps) {
  return (
    <html>
      <Head>
        <title>Postal Codes</title>
      </Head>
      <body>
        <Component />
      </body>
    </html>
  );
}
