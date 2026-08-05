import { redirect } from "next/navigation";
import ClubPanel from "@/components/UI/panel/ClubPanel";
import {
  getClubViewer,
  getMyComments,
  getMyLikedPosts,
  getMyPosts,
} from "@/lib/club/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const viewer = await getClubViewer();
  if (!viewer) redirect("/auth");

  const [posts, comments, liked] = await Promise.all([
    getMyPosts(viewer),
    getMyComments(viewer),
    getMyLikedPosts(viewer),
  ]);

  return (
    <ClubPanel
      viewerName={viewer.name}
      posts={posts}
      comments={comments}
      liked={liked}
    />
  );
}
