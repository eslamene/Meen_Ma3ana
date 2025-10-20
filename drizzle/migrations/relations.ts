import { relations } from "drizzle-orm/relations";
import { users, cases, caseCategories, caseImages, caseStatusHistory, caseUpdates, communications, contributions, projectCycles, projects, sponsorships, notifications } from "./schema";

export const casesRelations = relations(cases, ({one, many}) => ({
	user_assignedTo: one(users, {
		fields: [cases.assignedTo],
		references: [users.id],
		relationName: "cases_assignedTo_users_id"
	}),
	caseCategory: one(caseCategories, {
		fields: [cases.categoryId],
		references: [caseCategories.id]
	}),
	user_createdBy: one(users, {
		fields: [cases.createdBy],
		references: [users.id],
		relationName: "cases_createdBy_users_id"
	}),
	user_sponsoredBy: one(users, {
		fields: [cases.sponsoredBy],
		references: [users.id],
		relationName: "cases_sponsoredBy_users_id"
	}),
	caseImages: many(caseImages),
	caseStatusHistories: many(caseStatusHistory),
	caseUpdates: many(caseUpdates),
	contributions: many(contributions),
	sponsorships: many(sponsorships),
}));

export const usersRelations = relations(users, ({many}) => ({
	cases_assignedTo: many(cases, {
		relationName: "cases_assignedTo_users_id"
	}),
	cases_createdBy: many(cases, {
		relationName: "cases_createdBy_users_id"
	}),
	cases_sponsoredBy: many(cases, {
		relationName: "cases_sponsoredBy_users_id"
	}),
	caseStatusHistories: many(caseStatusHistory),
	caseUpdates: many(caseUpdates),
	communications_recipientId: many(communications, {
		relationName: "communications_recipientId_users_id"
	}),
	communications_senderId: many(communications, {
		relationName: "communications_senderId_users_id"
	}),
	contributions: many(contributions),
	projects_assignedTo: many(projects, {
		relationName: "projects_assignedTo_users_id"
	}),
	projects_createdBy: many(projects, {
		relationName: "projects_createdBy_users_id"
	}),
	sponsorships: many(sponsorships),
	notifications: many(notifications),
}));

export const caseCategoriesRelations = relations(caseCategories, ({many}) => ({
	cases: many(cases),
}));

export const caseImagesRelations = relations(caseImages, ({one}) => ({
	case: one(cases, {
		fields: [caseImages.caseId],
		references: [cases.id]
	}),
}));

export const caseStatusHistoryRelations = relations(caseStatusHistory, ({one}) => ({
	case: one(cases, {
		fields: [caseStatusHistory.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [caseStatusHistory.changedBy],
		references: [users.id]
	}),
}));

export const caseUpdatesRelations = relations(caseUpdates, ({one}) => ({
	case: one(cases, {
		fields: [caseUpdates.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [caseUpdates.createdBy],
		references: [users.id]
	}),
}));

export const communicationsRelations = relations(communications, ({one}) => ({
	user_recipientId: one(users, {
		fields: [communications.recipientId],
		references: [users.id],
		relationName: "communications_recipientId_users_id"
	}),
	user_senderId: one(users, {
		fields: [communications.senderId],
		references: [users.id],
		relationName: "communications_senderId_users_id"
	}),
}));

export const contributionsRelations = relations(contributions, ({one}) => ({
	case: one(cases, {
		fields: [contributions.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [contributions.donorId],
		references: [users.id]
	}),
	projectCycle: one(projectCycles, {
		fields: [contributions.projectCycleId],
		references: [projectCycles.id]
	}),
	project: one(projects, {
		fields: [contributions.projectId],
		references: [projects.id]
	}),
}));

export const projectCyclesRelations = relations(projectCycles, ({one, many}) => ({
	contributions: many(contributions),
	project: one(projects, {
		fields: [projectCycles.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	contributions: many(contributions),
	user_assignedTo: one(users, {
		fields: [projects.assignedTo],
		references: [users.id],
		relationName: "projects_assignedTo_users_id"
	}),
	user_createdBy: one(users, {
		fields: [projects.createdBy],
		references: [users.id],
		relationName: "projects_createdBy_users_id"
	}),
	projectCycles: many(projectCycles),
	sponsorships: many(sponsorships),
}));

export const sponsorshipsRelations = relations(sponsorships, ({one}) => ({
	case: one(cases, {
		fields: [sponsorships.caseId],
		references: [cases.id]
	}),
	project: one(projects, {
		fields: [sponsorships.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [sponsorships.sponsorId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.recipientId],
		references: [users.id]
	}),
}));