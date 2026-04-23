const { z } = require("zod");

const urlSchema = z.string().trim().url("Enter a valid link");

const complaintSchema = z.object({
  category: z.string().min(2).max(40),
  subject: z.string().min(3).max(120),
  message: z.string().trim().min(3).max(2000),
  evidenceType: z.enum(["TEXT", "LINK", "FILE"]).default("TEXT"),
  evidenceText: z.string().trim().max(4000).optional().default("")
}).superRefine((data, ctx) => {
  if (data.evidenceType === "LINK" && !data.evidenceText) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["evidenceText"], message: "Link is required" });
    return;
  }

  if (data.evidenceType === "LINK") {
    const result = urlSchema.safeParse(data.evidenceText);
    if (!result.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["evidenceText"], message: "Enter a valid link" });
    }
  }

  if (data.evidenceType === "TEXT" && !data.evidenceText && !data.message) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["evidenceText"], message: "Message is required" });
  }
});

const complaintStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"]);

const adminComplaintUpdateSchema = z.object({
  status: complaintStatusSchema,
  adminResponse: z.string().trim().min(3).max(2000)
});

module.exports = { complaintSchema, complaintStatusSchema, adminComplaintUpdateSchema };
