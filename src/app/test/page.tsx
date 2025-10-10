import { JeopardyBoard } from "./_components/jeopardy-board";
import { db } from "@/db";
import { categoriesTable } from "@/db/schema";

export default function Page() {
  // server component: query the categories table and pass a promise of string[] to the client
  const categoriesPromise = db
    .select({ name: categoriesTable.name })
    .from(categoriesTable)
    .then((rows) => rows.map((r) => r.name));

  return <JeopardyBoard categoriesPromise={categoriesPromise} />;
}
