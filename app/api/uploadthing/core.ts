
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getToken } from "next-auth/jwt";

const f = createUploadthing();
const auth = async (req: Request) => {
  const token = await getToken({
    req: req as any,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const id = (token as any)?.id ?? token?.sub;
  if (!id) return null;
  return { id: String(id), role: (token as any).role as string | undefined };
};

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "16MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      const user = await auth(req);
      if (!user) throw new UploadThingError("Unauthorized");
      if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT") {
        throw new UploadThingError("Forbidden");
      }
      return { userId: user.id, role: user.role };
    })
    .onUploadComplete(async ({ metadata, file }) => {
  
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;