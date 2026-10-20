import { redirect } from "next/navigation";

// "Who knows what" is now the People lens of the Brain.
export default function GraphPage() {
  redirect("/brain");
}
