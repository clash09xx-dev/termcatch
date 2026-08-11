import "server-only";

import { prisma } from "@/lib/prisma";
import { warsawDateString } from "@/lib/timezone";
import { generateReviewReply, type ReviewTone } from "../features/reviews";
import type { AiTool, ActionProposal } from "./registry";
import { str } from "./registry";

export const reviewTools: AiTool[] = [
  {
    name: "list_reviews",
    kind: "read",
    description: "Lista opublikowanych opinii. Ustaw unansweredOnly=true, aby pokazać tylko te bez odpowiedzi. Maks. 30.",
    parameters: {
      properties: { unansweredOnly: { type: "boolean" } },
    },
    async run(args, { actor }) {
      const unansweredOnly = args.unansweredOnly === true;
      const reviews = await prisma.review.findMany({
        where: { businessId: actor.businessId, status: "PUBLISHED", ...(unansweredOnly ? { replyText: null } : {}) },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true, rating: true, comment: true, replyText: true, createdAt: true,
          customer: { select: { firstName: true, lastName: true } },
        },
      });
      return {
        count: reviews.length,
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          client: `${r.customer.firstName} ${r.customer.lastName}`.trim(),
          date: warsawDateString(r.createdAt),
          answered: r.replyText !== null,
        })),
      };
    },
  },

  {
    name: "propose_review_reply",
    kind: "write",
    description:
      "Wygeneruj propozycję odpowiedzi na opinię i przygotuj ją do opublikowania (właściciel zatwierdza). Ton: professional | friendly | short.",
    parameters: {
      properties: {
        reviewId: { type: "string" },
        tone: { type: "string", enum: ["professional", "friendly", "short"] },
      },
      required: ["reviewId"],
    },
    async run(args, { actor }): Promise<ActionProposal | { error: string }> {
      const reviewId = str(args, "reviewId");
      if (!reviewId) return { error: "Brak reviewId." };
      const review = await prisma.review.findFirst({
        where: { id: reviewId, businessId: actor.businessId, status: "PUBLISHED" },
        select: { id: true, rating: true, comment: true, replyText: true, customer: { select: { firstName: true, lastName: true } } },
      });
      if (!review) return { error: "Nie znaleziono opublikowanej opinii w tym salonie." };
      if (review.replyText) return { error: "Ta opinia ma już odpowiedź." };

      const tone = (str(args, "tone") as ReviewTone) || (review.rating <= 3 ? "professional" : "friendly");
      const draft = await generateReviewReply({
        businessId: actor.businessId,
        userId: actor.dbUserId,
        businessName: actor.businessName,
        rating: review.rating,
        comment: review.comment,
        tone,
      });
      const client = `${review.customer.firstName} ${review.customer.lastName}`.trim();
      return {
        kind: "proposal",
        actionType: "publish_review_reply",
        title: "Opublikuj odpowiedź na opinię",
        summary: `Odpowiedź na opinię (${review.rating}/5) od ${client}`,
        details: [
          { label: "Opinia", value: (review.comment ?? "(sama ocena)").slice(0, 200) },
          { label: "Ton", value: tone },
        ],
        params: { reviewId: review.id, replyText: draft },
        draft,
        confirmLabel: "Opublikuj odpowiedź",
        external: review.rating <= 3,
      };
    },
  },
];
