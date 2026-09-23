import Game from "@/components/Game";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { debug } = await searchParams;
  return <Game debug={debug === "1"} />;
}
