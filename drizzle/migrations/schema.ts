import { pgTable, uuid, text, timestamp, foreignKey, numeric, integer, boolean, unique, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const localization = pgTable("localization", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	value: text().notNull(),
	language: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const cases = pgTable("cases", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	type: text().default('one-time').notNull(),
	categoryId: uuid("category_id"),
	priority: text().notNull(),
	location: text(),
	beneficiaryName: text("beneficiary_name"),
	beneficiaryContact: text("beneficiary_contact"),
	targetAmount: numeric("target_amount", { precision: 10, scale:  2 }).notNull(),
	currentAmount: numeric("current_amount", { precision: 10, scale:  2 }).default('0').notNull(),
	status: text().default('draft').notNull(),
	frequency: text(),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	duration: integer(),
	createdBy: uuid("created_by").notNull(),
	assignedTo: uuid("assigned_to"),
	sponsoredBy: uuid("sponsored_by"),
	supportingDocuments: text("supporting_documents"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "cases_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [caseCategories.id],
			name: "cases_category_id_case_categories_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "cases_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.sponsoredBy],
			foreignColumns: [users.id],
			name: "cases_sponsored_by_users_id_fk"
		}),
]);

export const caseImages = pgTable("case_images", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	imagePath: text("image_path").notNull(),
	imageUrl: text("image_url").notNull(),
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	isPrimary: boolean("is_primary").default(false).notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "case_images_case_id_cases_id_fk"
		}),
]);

export const caseStatusHistory = pgTable("case_status_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	previousStatus: text("previous_status"),
	newStatus: text("new_status").notNull(),
	changedBy: uuid("changed_by"),
	systemTriggered: boolean("system_triggered").default(false).notNull(),
	changeReason: text("change_reason"),
	changedAt: timestamp("changed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "case_status_history_case_id_cases_id_fk"
		}),
	foreignKey({
			columns: [table.changedBy],
			foreignColumns: [users.id],
			name: "case_status_history_changed_by_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	role: text().default('donor').notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	phone: text(),
	address: text(),
	profileImage: text("profile_image"),
	isActive: boolean("is_active").default(true).notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	language: text().default('en').notNull(),
	notifications: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const caseUpdates = pgTable("case_updates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	title: text().notNull(),
	content: text().notNull(),
	updateType: text("update_type").default('general').notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	attachments: text(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "case_updates_case_id_cases_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "case_updates_created_by_users_id_fk"
		}),
]);

export const caseCategories = pgTable("case_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	icon: text(),
	color: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const communications = pgTable("communications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	senderId: uuid("sender_id").notNull(),
	recipientId: uuid("recipient_id").notNull(),
	subject: text().notNull(),
	message: text().notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [users.id],
			name: "communications_recipient_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "communications_sender_id_users_id_fk"
		}),
]);

export const contributions = pgTable("contributions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: text().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	paymentMethod: text("payment_method").notNull(),
	status: text().default('pending').notNull(),
	proofOfPayment: text("proof_of_payment"),
	donorId: uuid("donor_id").notNull(),
	caseId: uuid("case_id"),
	projectId: uuid("project_id"),
	projectCycleId: uuid("project_cycle_id"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "contributions_case_id_cases_id_fk"
		}),
	foreignKey({
			columns: [table.donorId],
			foreignColumns: [users.id],
			name: "contributions_donor_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectCycleId],
			foreignColumns: [projectCycles.id],
			name: "contributions_project_cycle_id_project_cycles_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "contributions_project_id_projects_id_fk"
		}),
]);

export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	category: text().notNull(),
	targetAmount: numeric("target_amount", { precision: 10, scale:  2 }).notNull(),
	currentAmount: numeric("current_amount", { precision: 10, scale:  2 }).default('0').notNull(),
	status: text().default('active').notNull(),
	cycleDuration: text("cycle_duration").notNull(),
	cycleDurationDays: integer("cycle_duration_days"),
	totalCycles: integer("total_cycles"),
	currentCycleNumber: integer("current_cycle_number").default(1).notNull(),
	nextCycleDate: timestamp("next_cycle_date", { mode: 'string' }),
	lastCycleDate: timestamp("last_cycle_date", { mode: 'string' }),
	autoProgress: boolean("auto_progress").default(true).notNull(),
	createdBy: uuid("created_by").notNull(),
	assignedTo: uuid("assigned_to"),
	supportingDocuments: text("supporting_documents"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "projects_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "projects_created_by_users_id_fk"
		}),
]);

export const projectCycles = pgTable("project_cycles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	cycleNumber: integer("cycle_number").notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	targetAmount: numeric("target_amount", { precision: 10, scale:  2 }).notNull(),
	currentAmount: numeric("current_amount", { precision: 10, scale:  2 }).default('0').notNull(),
	status: text().default('active').notNull(),
	progressPercentage: numeric("progress_percentage", { precision: 5, scale:  2 }).default('0').notNull(),
	notes: text(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_cycles_project_id_projects_id_fk"
		}),
]);

export const sponsorships = pgTable("sponsorships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sponsorId: uuid("sponsor_id").notNull(),
	caseId: uuid("case_id"),
	projectId: uuid("project_id"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	status: text().default('pending').notNull(),
	terms: text(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "sponsorships_case_id_cases_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "sponsorships_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.sponsorId],
			foreignColumns: [users.id],
			name: "sponsorships_sponsor_id_users_id_fk"
		}),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: text().notNull(),
	recipientId: uuid("recipient_id").notNull(),
	title: text().notNull(),
	message: text().notNull(),
	data: jsonb(),
	read: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [users.id],
			name: "notifications_recipient_id_users_id_fk"
		}),
]);
