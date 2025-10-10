import { JeopardyBoard } from "./_components/jeopardy-board";
import { db } from "@/db";
import { categoriesTable } from "@/db/schema";
import { sql } from "drizzle-orm";

export default function Page() {
  // server component: query the categories table and pass a promise of string[] to the client
  const categoriesPromise = db
    .select({ name: categoriesTable.name })
    .from(categoriesTable)
    .orderBy(sql`RANDOM()`)
    .limit(6) // limit to 6 categories for the board
    .then((rows) => rows.map((r) => r.name));

  return <JeopardyBoard categoriesPromise={categoriesPromise} />;
}
