const { z } = require("zod");

const complaintSchema = z.object({
  category: z.string().min(2).max(40),
  subject: z.string().min(3).max(120),
  message: z.string().min(10).max(2000)
});

const complaintStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"]);

const adminComplaintUpdateSchema = z.object({
  status: complaintStatusSchema,
  adminResponse: z.string().trim().min(3).max(2000)
});

module.exports = { complaintSchema, complaintStatusSchema, adminComplaintUpdateSchema };
