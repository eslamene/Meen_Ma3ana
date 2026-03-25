import { pgTable, pgSchema, index, foreignKey, uuid, text, bigint, boolean, integer, timestamp, unique, pgPolicy, varchar, jsonb, check, numeric, uniqueIndex, inet, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

const authSchema = pgSchema("auth");

export const usersInAuth = authSchema.table("users", {
	id: uuid().primaryKey().notNull(),
});



export const caseFiles = pgTable("case_files", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	filename: text().notNull(),
	originalFilename: text("original_filename"),
	fileUrl: text("file_url").notNull(),
	filePath: text("file_path"),
	fileType: text("file_type").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }).default(0),
	category: text().default('other'),
	description: text(),
	isPublic: boolean("is_public").default(false),
	isPrimary: boolean("is_primary").default(false),
	displayOrder: integer("display_order").default(0),
	uploadedBy: uuid("uploaded_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_case_files_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	index("idx_case_files_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_case_files_display_order").using("btree", table.caseId.asc().nullsLast().op("uuid_ops"), table.displayOrder.asc().nullsLast().op("int4_ops")),
	index("idx_case_files_file_type").using("btree", table.fileType.asc().nullsLast().op("text_ops")),
	index("idx_case_files_filename").using("btree", table.filename.asc().nullsLast().op("text_ops")),
	index("idx_case_files_is_primary").using("btree", table.caseId.asc().nullsLast().op("bool_ops"), table.isPrimary.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "case_files_case_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "case_files_uploaded_by_fkey"
		}),
]);

export const adminUserRoles = pgTable("admin_user_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	roleId: uuid("role_id").notNull(),
	assignedBy: uuid("assigned_by"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	isActive: boolean("is_active").default(true),
}, (table) => [
	index("idx_admin_user_roles_active").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("uuid_ops")).where(sql`(is_active = true)`),
	index("idx_admin_user_roles_role_id").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	index("idx_admin_user_roles_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "admin_user_roles_assigned_by_fkey"
		}),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [adminRoles.id],
			name: "admin_user_roles_role_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "admin_user_roles_user_id_fkey"
		}).onDelete("cascade"),
	unique("admin_user_roles_user_id_role_id_key").on(table.userId, table.roleId),
	pgPolicy("Users can view their own roles", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Admins can insert user roles", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can update user roles", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Admins can view all user roles", { as: "permissive", for: "select", to: ["public"] }),
]);

export const adminMenuItems = pgTable("admin_menu_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	parentId: uuid("parent_id"),
	label: varchar({ length: 100 }).notNull(),
	labelAr: varchar("label_ar", { length: 100 }),
	href: varchar({ length: 255 }).notNull(),
	icon: varchar({ length: 50 }),
	description: text(),
	descriptionAr: text("description_ar"),
	sortOrder: integer("sort_order").default(0),
	permissionId: uuid("permission_id"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	isPublicNav: boolean("is_public_nav").default(false),
	navMetadata: jsonb("nav_metadata").default({}),
}, (table) => [
	index("idx_admin_menu_items_parent_id").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	index("idx_admin_menu_items_public_nav").using("btree", table.isPublicNav.asc().nullsLast().op("bool_ops"), table.sortOrder.asc().nullsLast().op("int4_ops")).where(sql`((is_public_nav = true) AND (is_active = true))`),
	index("idx_admin_menu_items_sort_order").using("btree", table.sortOrder.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "admin_menu_items_parent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [adminPermissions.id],
			name: "admin_menu_items_permission_id_fkey"
		}).onDelete("set null"),
	unique("admin_menu_items_href_parent_id_key").on(table.parentId, table.href),
	pgPolicy("Super admins can delete menu items", { as: "permissive", for: "delete", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM (admin_user_roles ur
     JOIN admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = 'super_admin'::text) AND (r.is_active = true))))` }),
	pgPolicy("Super admins can insert menu items", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Super admins can update menu items", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Super admins can view all menu items", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Anyone can view active menu items", { as: "permissive", for: "select", to: ["public"] }),
]);

export const adminRoles = pgTable("admin_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	displayName: varchar("display_name", { length: 100 }).notNull(),
	displayNameAr: varchar("display_name_ar", { length: 100 }),
	description: text(),
	descriptionAr: text("description_ar"),
	level: integer().default(0).notNull(),
	isSystem: boolean("is_system").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("admin_roles_name_key").on(table.name),
	pgPolicy("Anyone can view active roles", { as: "permissive", for: "select", to: ["public"], using: sql`(is_active = true)` }),
]);

export const adminPermissions = pgTable("admin_permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 200 }).notNull(),
	displayNameAr: varchar("display_name_ar", { length: 200 }),
	description: text(),
	descriptionAr: text("description_ar"),
	resource: varchar({ length: 50 }).notNull(),
	action: varchar({ length: 50 }).notNull(),
	isSystem: boolean("is_system").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admin_permissions_resource_action").using("btree", table.resource.asc().nullsLast().op("text_ops"), table.action.asc().nullsLast().op("text_ops")),
	unique("admin_permissions_name_key").on(table.name),
	pgPolicy("Anyone can view active permissions", { as: "permissive", for: "select", to: ["public"], using: sql`(is_active = true)` }),
]);

export const adminRolePermissions = pgTable("admin_role_permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	roleId: uuid("role_id").notNull(),
	permissionId: uuid("permission_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admin_role_permissions_permission_id").using("btree", table.permissionId.asc().nullsLast().op("uuid_ops")),
	index("idx_admin_role_permissions_role_id").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [adminPermissions.id],
			name: "admin_role_permissions_permission_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [adminRoles.id],
			name: "admin_role_permissions_role_id_fkey"
		}).onDelete("cascade"),
	unique("admin_role_permissions_role_id_permission_id_key").on(table.roleId, table.permissionId),
	pgPolicy("Admins can insert role permissions", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`is_current_user_admin()`  }),
	pgPolicy("Admins can delete role permissions", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Anyone can view role permissions", { as: "permissive", for: "select", to: ["public"] }),
]);

export const landingStats = pgTable("landing_stats", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	statKey: text("stat_key").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	statValue: bigint("stat_value", { mode: "number" }).default(0).notNull(),
	displayFormat: text("display_format"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_landing_stats_key").using("btree", table.statKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "landing_stats_updated_by_fkey"
		}),
	unique("landing_stats_stat_key_key").on(table.statKey),
	pgPolicy("Anyone can read landing stats", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Authenticated users can update landing stats", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Authenticated users can insert landing stats", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	action: varchar({ length: 50 }).notNull(),
	tableName: varchar("table_name", { length: 100 }).notNull(),
	recordId: uuid("record_id").notNull(),
	userId: uuid("user_id"),
	details: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_audit_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_audit_logs_table_name").using("btree", table.tableName.asc().nullsLast().op("text_ops")),
	index("idx_audit_logs_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_logs_user_id_fkey"
		}),
	pgPolicy("Users can view own audit logs", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("System can insert audit logs", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const beneficiaries = pgTable("beneficiaries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	nameAr: text("name_ar"),
	age: integer(),
	gender: text(),
	mobileNumber: text("mobile_number"),
	email: text(),
	alternativeContact: text("alternative_contact"),
	nationalId: text("national_id"),
	idType: text("id_type").default('national_id'),
	address: text(),
	city: text(),
	governorate: text(),
	country: text().default('Egypt'),
	medicalCondition: text("medical_condition"),
	socialSituation: text("social_situation"),
	familySize: integer("family_size"),
	dependents: integer(),
	isVerified: boolean("is_verified").default(false),
	verificationDate: timestamp("verification_date", { withTimezone: true, mode: 'string' }),
	verificationNotes: text("verification_notes"),
	notes: text(),
	tags: text().array(),
	riskLevel: text("risk_level").default('low'),
	totalCases: integer("total_cases").default(0),
	activeCases: integer("active_cases").default(0),
	totalAmountReceived: numeric("total_amount_received", { precision: 15, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdBy: uuid("created_by"),
	yearOfBirth: integer("year_of_birth"),
	additionalMobileNumber: varchar("additional_mobile_number", { length: 20 }),
	idTypeId: uuid("id_type_id"),
	cityId: uuid("city_id"),
}, (table) => [
	index("idx_beneficiaries_city").using("btree", table.city.asc().nullsLast().op("text_ops")),
	index("idx_beneficiaries_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_beneficiaries_is_verified").using("btree", table.isVerified.asc().nullsLast().op("bool_ops")),
	index("idx_beneficiaries_mobile").using("btree", table.mobileNumber.asc().nullsLast().op("text_ops")).where(sql`(mobile_number IS NOT NULL)`),
	index("idx_beneficiaries_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("idx_beneficiaries_name_search").using("gin", sql`to_tsvector('english'::regconfig, name)`),
	index("idx_beneficiaries_national_id").using("btree", table.nationalId.asc().nullsLast().op("text_ops")).where(sql`(national_id IS NOT NULL)`),
	index("idx_beneficiaries_tags").using("gin", table.tags.asc().nullsLast().op("array_ops")),
	index("idx_beneficiaries_year_of_birth").using("btree", table.yearOfBirth.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.cityId],
			foreignColumns: [cities.id],
			name: "beneficiaries_city_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "beneficiaries_created_by_fkey"
		}),
	foreignKey({
			columns: [table.idTypeId],
			foreignColumns: [idTypes.id],
			name: "beneficiaries_id_type_id_fkey"
		}),
	unique("unique_mobile_natid").on(table.mobileNumber, table.nationalId),
	pgPolicy("Authenticated users can view beneficiaries", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() IS NOT NULL)` }),
	check("at_least_one_identifier", sql`(mobile_number IS NOT NULL) OR (national_id IS NOT NULL)`),
	check("beneficiaries_gender_check", sql`gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])`),
	check("beneficiaries_id_type_check", sql`id_type = ANY (ARRAY['national_id'::text, 'passport'::text, 'other'::text])`),
	check("beneficiaries_risk_level_check", sql`risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])`),
]);

export const systemConfig = pgTable("system_config", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	configKey: text("config_key").notNull(),
	configValue: text("config_value").notNull(),
	description: text(),
	descriptionAr: text("description_ar"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	groupType: text("group_type"),
}, (table) => [
	index("idx_system_config_group_type").using("btree", table.groupType.asc().nullsLast().op("text_ops")),
	index("idx_system_config_key").using("btree", table.configKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "system_config_updated_by_fkey"
		}),
	unique("system_config_config_key_key").on(table.configKey),
	pgPolicy("Anyone can read system config", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Authenticated users can update system config", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Authenticated users can insert system config", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const localization = pgTable("localization", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	value: text().notNull(),
	language: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const landingContacts = pgTable("landing_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	message: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_landing_contacts_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_landing_contacts_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	pgPolicy("Anyone can submit contact form", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`true`  }),
	pgPolicy("No updates or deletes", { as: "permissive", for: "all", to: ["public"] }),
	check("message_length", sql`(char_length(message) >= 10) AND (char_length(message) <= 5000)`),
	check("valid_email_format", sql`email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text`),
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

export const caseCategories = pgTable("case_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	icon: text(),
	color: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	nameEn: text("name_en").notNull(),
	nameAr: text("name_ar").notNull(),
	descriptionEn: text("description_en"),
	descriptionAr: text("description_ar"),
}, (table) => [
	pgPolicy("Anyone can view active case categories", { as: "permissive", for: "select", to: ["public"], using: sql`(is_active = true)` }),
	pgPolicy("Admins can view all case categories", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Admins can insert case categories", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can update case categories", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Admins can delete case categories", { as: "permissive", for: "delete", to: ["public"] }),
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
	title: text(),
	message: text(),
	data: jsonb(),
	read: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	titleEn: text("title_en"),
	titleAr: text("title_ar"),
	messageEn: text("message_en"),
	messageAr: text("message_ar"),
}, (table) => [
	index("idx_notifications_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_notifications_recipient_created").using("btree", table.recipientId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [users.id],
			name: "notifications_recipient_id_users_id_fk"
		}),
	pgPolicy("Users can view own notifications", { as: "permissive", for: "select", to: ["public"], using: sql`((auth.uid() IS NOT NULL) AND (recipient_id = auth.uid()))` }),
	pgPolicy("Users can update own notifications", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Service can insert notifications", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can view all notifications", { as: "permissive", for: "select", to: ["public"] }),
]);

export const recurringContributions = pgTable("recurring_contributions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	donorId: uuid("donor_id").notNull(),
	caseId: uuid("case_id"),
	projectId: uuid("project_id"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	frequency: text().notNull(),
	status: text().default('active').notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	nextContributionDate: timestamp("next_contribution_date", { mode: 'string' }).notNull(),
	totalContributions: integer("total_contributions").default(0).notNull(),
	successfulContributions: integer("successful_contributions").default(0).notNull(),
	failedContributions: integer("failed_contributions").default(0).notNull(),
	paymentMethod: text("payment_method").notNull(),
	autoProcess: boolean("auto_process").default(true).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "recurring_contributions_case_id_cases_id_fk"
		}),
	foreignKey({
			columns: [table.donorId],
			foreignColumns: [users.id],
			name: "recurring_contributions_donor_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "recurring_contributions_project_id_projects_id_fk"
		}),
]);

export const paymentMethods = pgTable("payment_methods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	nameEn: text("name_en"),
	nameAr: text("name_ar"),
	descriptionEn: text("description_en"),
	descriptionAr: text("description_ar"),
	icon: text(),
}, (table) => [
	index("idx_payment_methods_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("idx_payment_methods_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	unique("payment_methods_code_key").on(table.code),
	pgPolicy("Anyone can view active payment methods", { as: "permissive", for: "select", to: ["public"], using: sql`(is_active = true)` }),
	pgPolicy("Admins can view all payment methods", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Admins can insert payment methods", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can update payment methods", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Admins can delete payment methods", { as: "permissive", for: "delete", to: ["public"] }),
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
	pgPolicy("Public can view public case updates", { as: "permissive", for: "select", to: ["public"], using: sql`(is_public = true)` }),
	pgPolicy("Users can view all case updates", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Admins can manage case updates", { as: "permissive", for: "all", to: ["public"] }),
]);

export const cases = pgTable("cases", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	titleEn: text("title_en").notNull(),
	descriptionAr: text("description_ar").notNull(),
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
	beneficiaryId: uuid("beneficiary_id"),
	titleAr: text("title_ar"),
	descriptionEn: text("description_en"),
	batchId: uuid("batch_id"),
}, (table) => [
	index("cases_batch_id_idx").using("btree", table.batchId.asc().nullsLast().op("uuid_ops")),
	index("idx_cases_beneficiary_id").using("btree", table.beneficiaryId.asc().nullsLast().op("uuid_ops")).where(sql`(beneficiary_id IS NOT NULL)`),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "cases_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batchUploads.id],
			name: "cases_batch_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.beneficiaryId],
			foreignColumns: [beneficiaries.id],
			name: "cases_beneficiary_id_fkey"
		}).onDelete("set null"),
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
	pgPolicy("Users can view own cases", { as: "permissive", for: "select", to: ["public"], using: sql`((auth.uid() IS NOT NULL) AND (created_by = auth.uid()))` }),
	pgPolicy("Users can view their own cases", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Admins can insert cases", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can update cases", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Admins can delete cases", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Admins can view all cases", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Public can view published cases", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Users can insert own cases", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can insert any cases", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own cases", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Admins can update any cases", { as: "permissive", for: "update", to: ["public"] }),
]);

export const contributions = pgTable("contributions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: text().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	status: text().default('pending').notNull(),
	proofOfPayment: text("proof_of_payment"),
	donorId: uuid("donor_id").notNull(),
	caseId: uuid("case_id"),
	projectId: uuid("project_id"),
	projectCycleId: uuid("project_cycle_id"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	anonymous: boolean().default(false).notNull(),
	paymentMethodId: uuid("payment_method_id").notNull(),
	paymentMethodBackup: text("payment_method_backup"),
	batchId: uuid("batch_id"),
}, (table) => [
	index("contributions_batch_id_idx").using("btree", table.batchId.asc().nullsLast().op("uuid_ops")),
	index("idx_contributions_admin_queries").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops"), table.donorId.asc().nullsLast().op("timestamp_ops")),
	index("idx_contributions_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	index("idx_contributions_donor_id").using("btree", table.donorId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batchUploads.id],
			name: "contributions_batch_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "contributions_case_id_fkey"
		}),
	foreignKey({
			columns: [table.donorId],
			foreignColumns: [users.id],
			name: "contributions_donor_id_fkey"
		}),
	foreignKey({
			columns: [table.paymentMethodId],
			foreignColumns: [paymentMethods.id],
			name: "contributions_payment_method_id_payment_methods_id_fk"
		}),
	foreignKey({
			columns: [table.projectCycleId],
			foreignColumns: [projectCycles.id],
			name: "contributions_project_cycle_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "contributions_project_id_fkey"
		}),
	pgPolicy("Public can view approved contributions", { as: "permissive", for: "select", to: ["public"], using: sql`check_contribution_approved(id)` }),
	pgPolicy("Users can view own contributions", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Admins can view all contributions", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Users can insert own contributions", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can insert any contributions", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own contributions", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Admins can update any contributions", { as: "permissive", for: "update", to: ["public"] }),
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
	notes: text(),
	tags: jsonb().default([]),
}, (table) => [
	uniqueIndex("users_phone_unique").using("btree", table.phone.asc().nullsLast().op("text_ops")).where(sql`((phone IS NOT NULL) AND (phone <> ''::text) AND (TRIM(BOTH FROM phone) <> ''::text))`),
	unique("users_email_unique").on(table.email),
	pgPolicy("Users can view own profile", { as: "permissive", for: "select", to: ["public"], using: sql`((auth.uid() IS NOT NULL) AND (auth.uid() = id))` }),
	pgPolicy("users all", { as: "permissive", for: "all", to: ["public"] }),
	pgPolicy("Admins can view all users", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Public can view names for approved contributors", { as: "permissive", for: "select", to: ["public"] }),
]);

export const contributionApprovalStatus = pgTable("contribution_approval_status", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contributionId: uuid("contribution_id").notNull(),
	status: text().default('pending').notNull(),
	adminId: uuid("admin_id"),
	rejectionReason: text("rejection_reason"),
	adminComment: text("admin_comment"),
	donorReply: text("donor_reply"),
	donorReplyDate: timestamp("donor_reply_date", { mode: 'string' }),
	paymentProofUrl: text("payment_proof_url"),
	resubmissionCount: integer("resubmission_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_contribution_latest_status_approval").using("btree", table.contributionId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [users.id],
			name: "contribution_approval_status_admin_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.contributionId],
			foreignColumns: [contributions.id],
			name: "contribution_approval_status_contribution_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Public can view approved contribution status", { as: "permissive", for: "select", to: ["public"], using: sql`(status = 'approved'::text)` }),
	pgPolicy("Users can view own contribution approval status", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Admins can view all contribution approval statuses", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Admins can insert contribution approval statuses", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can update contribution approval statuses", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can update donor reply for own contributions", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Admins can delete contribution approval statuses", { as: "permissive", for: "delete", to: ["public"] }),
]);

export const categoryDetectionRules = pgTable("category_detection_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	keyword: varchar({ length: 255 }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	priority: integer().default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
	categoryId: uuid("category_id").notNull(),
}, (table) => [
	index("idx_category_detection_rules_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(is_active = true)`),
	index("idx_category_detection_rules_category_id").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("idx_category_detection_rules_keyword").using("btree", table.keyword.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [caseCategories.id],
			name: "category_detection_rules_category_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "category_detection_rules_created_by_fkey"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "category_detection_rules_updated_by_fkey"
		}),
	unique("category_detection_rules_category_id_keyword_unique").on(table.keyword, table.categoryId),
	pgPolicy("Anyone can view active category detection rules", { as: "permissive", for: "select", to: ["public"], using: sql`(is_active = true)` }),
	pgPolicy("Admins can view all category detection rules", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Super admins can manage category detection rules", { as: "permissive", for: "all", to: ["public"] }),
]);

export const beneficiaryDocuments = pgTable("beneficiary_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	beneficiaryId: uuid("beneficiary_id").notNull(),
	documentType: varchar("document_type", { length: 50 }).notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileUrl: text("file_url").notNull(),
	fileSize: integer("file_size"),
	mimeType: varchar("mime_type", { length: 100 }),
	isPublic: boolean("is_public").default(false),
	description: text(),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	uploadedBy: uuid("uploaded_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_beneficiary_documents_beneficiary_id").using("btree", table.beneficiaryId.asc().nullsLast().op("uuid_ops")),
	index("idx_beneficiary_documents_public").using("btree", table.isPublic.asc().nullsLast().op("bool_ops")),
	index("idx_beneficiary_documents_type").using("btree", table.documentType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.beneficiaryId],
			foreignColumns: [beneficiaries.id],
			name: "beneficiary_documents_beneficiary_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "beneficiary_documents_uploaded_by_fkey"
		}),
	pgPolicy("Authenticated users can view beneficiary documents", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.role() = 'authenticated'::text)` }),
	pgPolicy("Admins can insert beneficiary documents", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can update beneficiary documents", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Admins can delete beneficiary documents", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Admins have full access to beneficiary documents", { as: "permissive", for: "all", to: ["public"] }),
]);

export const idTypes = pgTable("id_types", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 20 }).notNull(),
	nameEn: varchar("name_en", { length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }).notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("id_types_code_key").on(table.code),
	pgPolicy("Anyone can view id_types", { as: "permissive", for: "select", to: ["public"], using: sql`(is_active = true)` }),
]);

export const cities = pgTable("cities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 20 }).notNull(),
	nameEn: varchar("name_en", { length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }).notNull(),
	governorate: varchar({ length: 100 }),
	country: varchar({ length: 100 }).default('Egypt'),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("cities_code_key").on(table.code),
	pgPolicy("Anyone can view cities", { as: "permissive", for: "select", to: ["public"], using: sql`(is_active = true)` }),
]);

export const siteActivityLog = pgTable("site_activity_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	sessionId: varchar("session_id", { length: 255 }),
	activityType: varchar("activity_type", { length: 50 }).notNull(),
	category: varchar({ length: 50 }),
	action: varchar({ length: 100 }).notNull(),
	resourceType: varchar("resource_type", { length: 100 }),
	resourceId: uuid("resource_id"),
	resourcePath: varchar("resource_path", { length: 500 }),
	method: varchar({ length: 10 }),
	statusCode: integer("status_code"),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	referer: varchar({ length: 500 }),
	details: jsonb(),
	metadata: jsonb(),
	severity: varchar({ length: 20 }).default('info'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_site_activity_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_site_activity_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_site_activity_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_site_activity_resource_created").using("btree", table.resourceType.asc().nullsLast().op("uuid_ops"), table.resourceId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_site_activity_resource_id").using("btree", table.resourceId.asc().nullsLast().op("uuid_ops")),
	index("idx_site_activity_resource_path").using("btree", table.resourcePath.asc().nullsLast().op("text_ops")),
	index("idx_site_activity_resource_type").using("btree", table.resourceType.asc().nullsLast().op("text_ops")),
	index("idx_site_activity_session_id").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("idx_site_activity_severity").using("btree", table.severity.asc().nullsLast().op("text_ops")),
	index("idx_site_activity_type").using("btree", table.activityType.asc().nullsLast().op("text_ops")),
	index("idx_site_activity_type_created").using("btree", table.activityType.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_site_activity_user_created").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_site_activity_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_site_activity_user_id_merge").using("btree", table.userId.asc().nullsLast().op("uuid_ops")).where(sql`(user_id IS NOT NULL)`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "site_activity_log_user_id_fkey"
		}).onDelete("set null"),
	pgPolicy("Users can view own activity logs", { as: "permissive", for: "select", to: ["public"], using: sql`((auth.uid() = user_id) OR (auth.uid() IN ( SELECT admin_user_roles.user_id
   FROM admin_user_roles
  WHERE ((admin_user_roles.role_id IN ( SELECT admin_roles.id
           FROM admin_roles
          WHERE ((admin_roles.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))) AND (admin_user_roles.is_active = true)))) OR ((user_id IS NULL) AND (auth.uid() IN ( SELECT admin_user_roles.user_id
   FROM admin_user_roles
  WHERE ((admin_user_roles.role_id IN ( SELECT admin_roles.id
           FROM admin_roles
          WHERE ((admin_roles.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))) AND (admin_user_roles.is_active = true))))))` }),
	pgPolicy("System can insert activity logs", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can delete activity logs", { as: "permissive", for: "delete", to: ["public"] }),
]);

export const storageRules = pgTable("storage_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	bucketName: text("bucket_name").notNull(),
	maxFileSizeMb: integer("max_file_size_mb").default(5).notNull(),
	allowedExtensions: text("allowed_extensions").array().default(["RAY['pdf'::text", "'jpg'::text", "'jpeg'::text", "'png'::text", "'gif'::text", "'webp'::tex"]).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_storage_rules_bucket_name").using("btree", table.bucketName.asc().nullsLast().op("text_ops")),
	unique("storage_rules_bucket_name_key").on(table.bucketName),
	pgPolicy("storage_rules_select", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.role() = 'authenticated'::text)` }),
	pgPolicy("storage_rules_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("storage_rules_update", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("storage_rules_delete", { as: "permissive", for: "delete", to: ["public"] }),
]);

export const systemContent = pgTable("system_content", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contentKey: text("content_key").notNull(),
	titleEn: text("title_en").notNull(),
	titleAr: text("title_ar").notNull(),
	contentEn: text("content_en").notNull(),
	contentAr: text("content_ar").notNull(),
	description: text(),
	descriptionAr: text("description_ar"),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_system_content_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_system_content_key").using("btree", table.contentKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "system_content_updated_by_fkey"
		}),
	unique("system_content_content_key_key").on(table.contentKey),
	pgPolicy("Anyone can read active system content", { as: "permissive", for: "select", to: ["public"], using: sql`(is_active = true)` }),
	pgPolicy("Authenticated users can read all system content", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Authenticated users can update system content", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Authenticated users can insert system content", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Authenticated users can delete system content", { as: "permissive", for: "delete", to: ["public"] }),
]);

export const userMergeBackups = pgTable("user_merge_backups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	mergeId: uuid("merge_id").notNull(),
	fromUserId: uuid("from_user_id").notNull(),
	toUserId: uuid("to_user_id").notNull(),
	adminUserId: uuid("admin_user_id").notNull(),
	deleteSource: boolean("delete_source").default(false).notNull(),
	backupData: jsonb("backup_data").notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'string' }),
	totalRecordsBackedUp: integer("total_records_backed_up").default(0),
	totalRecordsMigrated: integer("total_records_migrated").default(0),
	errors: jsonb(),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	notes: text(),
}, (table) => [
	index("idx_user_merge_backups_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_user_merge_backups_from_user").using("btree", table.fromUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_merge_backups_merge_id").using("btree", table.mergeId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_merge_backups_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_user_merge_backups_to_user").using("btree", table.toUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.adminUserId],
			foreignColumns: [users.id],
			name: "user_merge_backups_admin_user_id_fkey"
		}),
	foreignKey({
			columns: [table.fromUserId],
			foreignColumns: [users.id],
			name: "user_merge_backups_from_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.toUserId],
			foreignColumns: [users.id],
			name: "user_merge_backups_to_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_merge_backups_merge_id_key").on(table.mergeId),
	pgPolicy("Admins can view merge backups", { as: "permissive", for: "select", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM (admin_user_roles aur
     JOIN admin_roles ar ON ((aur.role_id = ar.id)))
  WHERE ((aur.user_id = auth.uid()) AND ((ar.name)::text = 'super_admin'::text))))` }),
	pgPolicy("System can insert merge backups", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can update merge backups", { as: "permissive", for: "update", to: ["public"] }),
]);

export const pushSubscriptions = pgTable("push_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	endpoint: text().notNull(),
	p256Dh: text().notNull(),
	auth: text().notNull(),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_push_subscriptions_endpoint").using("btree", table.endpoint.asc().nullsLast().op("text_ops")),
	index("idx_push_subscriptions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "push_subscriptions_user_id_fkey"
		}).onDelete("cascade"),
	unique("push_subscriptions_user_id_endpoint_key").on(table.userId, table.endpoint),
	pgPolicy("Users can update their own push subscriptions", { as: "permissive", for: "update", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can delete their own push subscriptions", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Admins can view all push subscriptions", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Users can view their own push subscriptions", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Users can insert their own push subscriptions", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const fcmTokens = pgTable("fcm_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fcmToken: text("fcm_token").notNull(),
	deviceId: text("device_id"),
	platform: text(),
	userAgent: text("user_agent"),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_fcm_tokens_active").using("btree", table.active.asc().nullsLast().op("bool_ops")).where(sql`(active = true)`),
	index("idx_fcm_tokens_token").using("btree", table.fcmToken.asc().nullsLast().op("text_ops")),
	index("idx_fcm_tokens_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fcm_tokens_user_id_fkey"
		}).onDelete("cascade"),
	unique("fcm_tokens_user_id_fcm_token_key").on(table.userId, table.fcmToken),
	pgPolicy("Users can view their own FCM tokens", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert their own FCM tokens", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update their own FCM tokens", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can delete their own FCM tokens", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Admins can view all FCM tokens", { as: "permissive", for: "select", to: ["public"] }),
]);

export const aiRules = pgTable("ai_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ruleKey: text("rule_key").notNull(),
	instruction: text().notNull(),
	scope: text().default('global').notNull(),
	scopeReference: text("scope_reference"),
	priority: integer().default(100).notNull(),
	version: integer().default(1).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
	lang: text(),
	groupId: uuid("group_id"),
}, (table) => [
	index("idx_ai_rules_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(is_active = true)`),
	index("idx_ai_rules_group_id").using("btree", table.groupId.asc().nullsLast().op("uuid_ops")),
	index("idx_ai_rules_lang").using("btree", table.lang.asc().nullsLast().op("text_ops")),
	index("idx_ai_rules_priority").using("btree", table.priority.asc().nullsLast().op("int4_ops")),
	index("idx_ai_rules_rule_key").using("btree", table.ruleKey.asc().nullsLast().op("text_ops")),
	index("idx_ai_rules_scope").using("btree", table.scope.asc().nullsLast().op("text_ops"), table.scopeReference.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "ai_rules_created_by_fkey"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "ai_rules_updated_by_fkey"
		}),
	unique("ai_rules_rule_key_key").on(table.ruleKey),
	pgPolicy("Admins can view all ai_rules", { as: "permissive", for: "select", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM (admin_user_roles ur
     JOIN admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))))` }),
	pgPolicy("Admins can insert ai_rules", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can update ai_rules", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Admins can delete ai_rules", { as: "permissive", for: "delete", to: ["public"] }),
	check("ai_rules_priority_check", sql`(priority >= 1) AND (priority <= 1000)`),
	check("ai_rules_scope_check", sql`scope = ANY (ARRAY['global'::text, 'module'::text, 'feature'::text, 'tenant'::text, 'user'::text, 'role'::text, 'case'::text])`),
]);

export const batchUploads = pgTable("batch_uploads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	sourceFile: text("source_file"),
	status: text().default('pending').notNull(),
	totalItems: integer("total_items").default(0).notNull(),
	processedItems: integer("processed_items").default(0).notNull(),
	successfulItems: integer("successful_items").default(0).notNull(),
	failedItems: integer("failed_items").default(0).notNull(),
	errorSummary: jsonb("error_summary"),
	metadata: jsonb(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	index("batch_uploads_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("batch_uploads_created_by_idx").using("btree", table.createdBy.asc().nullsLast().op("uuid_ops")),
	index("batch_uploads_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "batch_uploads_created_by_fkey"
		}),
]);

export const aiRuleParameters = pgTable("ai_rule_parameters", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ruleKey: text("rule_key").notNull(),
	parameterKey: text("parameter_key").notNull(),
	parameterValue: text("parameter_value").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ai_rule_parameters_rule_key").using("btree", table.ruleKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ruleKey],
			foreignColumns: [aiRules.ruleKey],
			name: "ai_rule_parameters_rule_key_fkey"
		}).onDelete("cascade"),
	unique("ai_rule_parameters_rule_key_parameter_key_key").on(table.ruleKey, table.parameterKey),
	pgPolicy("Admins can view all ai_rule_parameters", { as: "permissive", for: "select", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM (admin_user_roles ur
     JOIN admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))))` }),
	pgPolicy("Admins can insert ai_rule_parameters", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Admins can update ai_rule_parameters", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Admins can delete ai_rule_parameters", { as: "permissive", for: "delete", to: ["public"] }),
]);

export const batchUploadItems = pgTable("batch_upload_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	batchId: uuid("batch_id").notNull(),
	rowNumber: integer("row_number").notNull(),
	caseNumber: text("case_number").notNull(),
	caseTitle: text("case_title").notNull(),
	contributorNickname: text("contributor_nickname").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	month: text().notNull(),
	userId: uuid("user_id"),
	caseId: uuid("case_id"),
	contributionId: uuid("contribution_id"),
	status: text().default('pending').notNull(),
	errorMessage: text("error_message"),
	mappingNotes: text("mapping_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("batch_upload_items_batch_id_idx").using("btree", table.batchId.asc().nullsLast().op("uuid_ops")),
	index("batch_upload_items_case_id_idx").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	index("batch_upload_items_case_number_idx").using("btree", table.caseNumber.asc().nullsLast().op("text_ops")),
	index("batch_upload_items_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("batch_upload_items_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batchUploads.id],
			name: "batch_upload_items_batch_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "batch_upload_items_case_id_fkey"
		}),
	foreignKey({
			columns: [table.contributionId],
			foreignColumns: [contributions.id],
			name: "batch_upload_items_contribution_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "batch_upload_items_user_id_fkey"
		}),
]);

export const nicknameMappings = pgTable("nickname_mappings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nickname: text().notNull(),
	userId: uuid("user_id").notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("nickname_mappings_nickname_idx").using("btree", table.nickname.asc().nullsLast().op("text_ops")),
	index("nickname_mappings_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "nickname_mappings_created_by_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "nickname_mappings_user_id_fkey"
		}),
	unique("nickname_mappings_nickname_key").on(table.nickname),
]);
export const contributionLatestStatus = pgView("contribution_latest_status", {	contributionId: uuid("contribution_id"),
	donorId: uuid("donor_id"),
	caseId: uuid("case_id"),
	amount: numeric({ precision: 10, scale:  2 }),
	contributionStatus: text("contribution_status"),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	approvalStatus: text("approval_status"),
	rejectionReason: text("rejection_reason"),
	adminComment: text("admin_comment"),
	statusUpdatedAt: timestamp("status_updated_at", { mode: 'string' }),
}).as(sql`SELECT DISTINCT ON (c.id) c.id AS contribution_id, c.donor_id, c.case_id, c.amount, c.status AS contribution_status, c.created_at, c.updated_at, COALESCE(cas.status, 'pending'::text) AS approval_status, cas.rejection_reason, cas.admin_comment, cas.updated_at AS status_updated_at FROM contributions c LEFT JOIN contribution_approval_status cas ON c.id = cas.contribution_id ORDER BY c.id, cas.created_at DESC NULLS LAST`);

export const categorySummaryView = pgView("category_summary_view", {	categoryId: uuid("category_id"),
	nameEn: text("name_en"),
	nameAr: text("name_ar"),
	descriptionEn: text("description_en"),
	descriptionAr: text("description_ar"),
	icon: text(),
	color: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalCases: bigint("total_cases", { mode: "number" }),
	totalAmount: numeric("total_amount"),
	averagePerCase: numeric("average_per_case"),
}).as(sql`SELECT cc.id AS category_id, COALESCE(cc.name_en, cc.name) AS name_en, COALESCE(cc.name_ar, cc.name) AS name_ar, COALESCE(cc.description_en, cc.description) AS description_en, COALESCE(cc.description_ar, cc.description) AS description_ar, cc.icon, cc.color, count(DISTINCT c.id) AS total_cases, COALESCE(sum(c.current_amount::numeric), 0::numeric) AS total_amount, CASE WHEN count(DISTINCT c.id) > 0 THEN COALESCE(sum(c.current_amount::numeric), 0::numeric) / count(DISTINCT c.id)::numeric ELSE 0::numeric END AS average_per_case FROM case_categories cc LEFT JOIN cases c ON c.category_id = cc.id AND c.status = 'published'::text WHERE cc.is_active = true GROUP BY cc.id, cc.name_en, cc.name_ar, cc.name, cc.description_en, cc.description_ar, cc.description, cc.icon, cc.color ORDER BY (COALESCE(sum(c.current_amount::numeric), 0::numeric)) DESC`);

export const siteActivitySummary = pgView("site_activity_summary", {	date: timestamp({ withTimezone: true, mode: 'string' }),
	activityType: varchar("activity_type", { length: 50 }),
	category: varchar({ length: 50 }),
	action: varchar({ length: 100 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	uniqueUsers: bigint("unique_users", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	uniqueSessions: bigint("unique_sessions", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	uniqueVisitorSessions: bigint("unique_visitor_sessions", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	visitorActivities: bigint("visitor_activities", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	authenticatedActivities: bigint("authenticated_activities", { mode: "number" }),
}).as(sql`SELECT date_trunc('day'::text, created_at) AS date, activity_type, category, action, count(*) AS count, count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users, count(DISTINCT session_id) AS unique_sessions, count(DISTINCT session_id) FILTER (WHERE user_id IS NULL) AS unique_visitor_sessions, count(*) FILTER (WHERE user_id IS NULL) AS visitor_activities, count(*) FILTER (WHERE user_id IS NOT NULL) AS authenticated_activities FROM site_activity_log GROUP BY (date_trunc('day'::text, created_at)), activity_type, category, action`);

export const visitorActivitySummary = pgView("visitor_activity_summary", {	date: timestamp({ withTimezone: true, mode: 'string' }),
	activityType: varchar("activity_type", { length: 50 }),
	category: varchar({ length: 50 }),
	action: varchar({ length: 100 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	count: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	uniqueVisitorSessions: bigint("unique_visitor_sessions", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	uniqueVisitorIps: bigint("unique_visitor_ips", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	uniquePagesViewed: bigint("unique_pages_viewed", { mode: "number" }),
}).as(sql`SELECT date_trunc('day'::text, created_at) AS date, activity_type, category, action, count(*) AS count, count(DISTINCT session_id) AS unique_visitor_sessions, count(DISTINCT ip_address) AS unique_visitor_ips, count(DISTINCT resource_path) AS unique_pages_viewed FROM site_activity_log WHERE user_id IS NULL GROUP BY (date_trunc('day'::text, created_at)), activity_type, category, action`);

export const visitorSessions = pgView("visitor_sessions", {	sessionId: varchar("session_id", { length: 255 }),
	sessionStart: timestamp("session_start", { withTimezone: true, mode: 'string' }),
	sessionEnd: timestamp("session_end", { withTimezone: true, mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pageViews: bigint("page_views", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	uniquePages: bigint("unique_pages", { mode: "number" }),
	pagesVisited: varchar("pages_visited"),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	sessionDurationSeconds: numeric("session_duration_seconds"),
}).as(sql`SELECT session_id, min(created_at) AS session_start, max(created_at) AS session_end, count(*) AS page_views, count(DISTINCT resource_path) AS unique_pages, array_agg(DISTINCT resource_path ORDER BY resource_path) AS pages_visited, max(ip_address) AS ip_address, max(user_agent) AS user_agent, EXTRACT(epoch FROM max(created_at) - min(created_at)) AS session_duration_seconds FROM site_activity_log WHERE user_id IS NULL AND activity_type::text = 'page_view'::text GROUP BY session_id`);

export const monthlyBreakdownView = pgView("monthly_breakdown_view", {	month: integer(),
	year: integer(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalCases: bigint("total_cases", { mode: "number" }),
	totalAmount: numeric("total_amount"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contributors: bigint({ mode: "number" }),
	topCategoryNameEn: text("top_category_name_en"),
	topCategoryNameAr: text("top_category_name_ar"),
	topCategoryId: uuid("top_category_id"),
	topCategoryAmount: numeric("top_category_amount"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	topCategoryCases: bigint("top_category_cases", { mode: "number" }),
}).with({"securityInvoker": true}).as(sql`WITH monthly_contributions AS ( SELECT EXTRACT(month FROM c.created_at)::integer AS month, EXTRACT(year FROM c.created_at)::integer AS year, c.case_id, c.amount, c.donor_id FROM contributions c WHERE c.status = 'approved'::text ), monthly_stats AS ( SELECT mc.month, mc.year, count(DISTINCT mc.case_id) AS total_cases, sum(mc.amount) AS total_amount, count(DISTINCT mc.donor_id) AS contributors FROM monthly_contributions mc GROUP BY mc.month, mc.year ), category_monthly AS ( SELECT mc.month, mc.year, COALESCE(cc.name_en, cc.name) AS category_name_en, COALESCE(cc.name_ar, cc.name) AS category_name_ar, cc.id AS category_id, sum(mc.amount) AS category_amount, count(DISTINCT mc.case_id) AS category_cases FROM monthly_contributions mc JOIN cases cs ON cs.id = mc.case_id AND cs.status = 'published'::text LEFT JOIN case_categories cc ON cc.id = cs.category_id GROUP BY mc.month, mc.year, cc.id, cc.name_en, cc.name_ar, cc.name ), top_categories AS ( SELECT cm.month, cm.year, cm.category_name_en, cm.category_name_ar, cm.category_id, cm.category_amount, cm.category_cases, row_number() OVER (PARTITION BY cm.month, cm.year ORDER BY cm.category_amount DESC) AS rank FROM category_monthly cm ) SELECT ms.month, ms.year, ms.total_cases, ms.total_amount, ms.contributors, tc.category_name_en AS top_category_name_en, tc.category_name_ar AS top_category_name_ar, tc.category_id AS top_category_id, COALESCE(tc.category_amount, 0::numeric) AS top_category_amount, COALESCE(tc.category_cases, 0::bigint) AS top_category_cases FROM monthly_stats ms LEFT JOIN top_categories tc ON tc.month = ms.month AND tc.year = ms.year AND tc.rank = 1 ORDER BY ms.year DESC, ms.month DESC`);