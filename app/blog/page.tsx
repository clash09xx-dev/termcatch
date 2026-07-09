import { redirect } from "next/navigation";

// Blog section removed — redirect visitors to the home page.
export default function BlogPage() {
  redirect("/");
}
