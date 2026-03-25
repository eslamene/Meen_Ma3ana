import { relations } from "drizzle-orm/relations";
import { cases, caseFiles, usersInAuth, adminUserRoles, adminRoles, adminMenuItems, adminPermissions, adminRolePermissions, landingStats, auditLogs, cities, beneficiaries, idTypes, systemConfig, caseStatusHistory, users, communications, projects, projectCycles, sponsorships, notifications, recurringContributions, caseUpdates, batchUploads, caseCategories, contributions, paymentMethods, contributionApprovalStatus, categoryDetectionRules, beneficiaryDocuments, siteActivityLog, systemContent, userMergeBackups, pushSubscriptions, fcmTokens, aiRules, aiRuleParameters, batchUploadItems, nicknameMappings } from "./schema";

export const caseFilesRelations = relations(caseFiles, ({one}) => ({
	case: one(cases, {
		fields: [caseFiles.caseId],
		references: [cases.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [caseFiles.uploadedBy],
		references: [usersInAuth.id]
	}),
}));

export const casesRelations = relations(cases, ({one, many}) => ({
	caseFiles: many(caseFiles),
	caseStatusHistories: many(caseStatusHistory),
	sponsorships: many(sponsorships),
	recurringContributions: many(recurringContributions),
	caseUpdates: many(caseUpdates),
	user_assignedTo: one(users, {
		fields: [cases.assignedTo],
		references: [users.id],
		relationName: "cases_assignedTo_users_id"
	}),
	batchUpload: one(batchUploads, {
		fields: [cases.batchId],
		references: [batchUploads.id]
	}),
	beneficiary: one(beneficiaries, {
		fields: [cases.beneficiaryId],
		references: [beneficiaries.id]
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
	contributions: many(contributions),
	batchUploadItems: many(batchUploadItems),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	caseFiles: many(caseFiles),
	adminUserRoles_assignedBy: many(adminUserRoles, {
		relationName: "adminUserRoles_assignedBy_usersInAuth_id"
	}),
	adminUserRoles_userId: many(adminUserRoles, {
		relationName: "adminUserRoles_userId_usersInAuth_id"
	}),
	landingStats: many(landingStats),
	auditLogs: many(auditLogs),
	beneficiaries: many(beneficiaries),
	systemConfigs: many(systemConfig),
	categoryDetectionRules_createdBy: many(categoryDetectionRules, {
		relationName: "categoryDetectionRules_createdBy_usersInAuth_id"
	}),
	categoryDetectionRules_updatedBy: many(categoryDetectionRules, {
		relationName: "categoryDetectionRules_updatedBy_usersInAuth_id"
	}),
	beneficiaryDocuments: many(beneficiaryDocuments),
	siteActivityLogs: many(siteActivityLog),
	systemContents: many(systemContent),
	userMergeBackups_adminUserId: many(userMergeBackups, {
		relationName: "userMergeBackups_adminUserId_usersInAuth_id"
	}),
	userMergeBackups_fromUserId: many(userMergeBackups, {
		relationName: "userMergeBackups_fromUserId_usersInAuth_id"
	}),
	userMergeBackups_toUserId: many(userMergeBackups, {
		relationName: "userMergeBackups_toUserId_usersInAuth_id"
	}),
	aiRules_createdBy: many(aiRules, {
		relationName: "aiRules_createdBy_usersInAuth_id"
	}),
	aiRules_updatedBy: many(aiRules, {
		relationName: "aiRules_updatedBy_usersInAuth_id"
	}),
}));

export const adminUserRolesRelations = relations(adminUserRoles, ({one}) => ({
	usersInAuth_assignedBy: one(usersInAuth, {
		fields: [adminUserRoles.assignedBy],
		references: [usersInAuth.id],
		relationName: "adminUserRoles_assignedBy_usersInAuth_id"
	}),
	adminRole: one(adminRoles, {
		fields: [adminUserRoles.roleId],
		references: [adminRoles.id]
	}),
	usersInAuth_userId: one(usersInAuth, {
		fields: [adminUserRoles.userId],
		references: [usersInAuth.id],
		relationName: "adminUserRoles_userId_usersInAuth_id"
	}),
}));

export const adminRolesRelations = relations(adminRoles, ({many}) => ({
	adminUserRoles: many(adminUserRoles),
	adminRolePermissions: many(adminRolePermissions),
}));

export const adminMenuItemsRelations = relations(adminMenuItems, ({one, many}) => ({
	adminMenuItem: one(adminMenuItems, {
		fields: [adminMenuItems.parentId],
		references: [adminMenuItems.id],
		relationName: "adminMenuItems_parentId_adminMenuItems_id"
	}),
	adminMenuItems: many(adminMenuItems, {
		relationName: "adminMenuItems_parentId_adminMenuItems_id"
	}),
	adminPermission: one(adminPermissions, {
		fields: [adminMenuItems.permissionId],
		references: [adminPermissions.id]
	}),
}));

export const adminPermissionsRelations = relations(adminPermissions, ({many}) => ({
	adminMenuItems: many(adminMenuItems),
	adminRolePermissions: many(adminRolePermissions),
}));

export const adminRolePermissionsRelations = relations(adminRolePermissions, ({one}) => ({
	adminPermission: one(adminPermissions, {
		fields: [adminRolePermissions.permissionId],
		references: [adminPermissions.id]
	}),
	adminRole: one(adminRoles, {
		fields: [adminRolePermissions.roleId],
		references: [adminRoles.id]
	}),
}));

export const landingStatsRelations = relations(landingStats, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [landingStats.updatedBy],
		references: [usersInAuth.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [auditLogs.userId],
		references: [usersInAuth.id]
	}),
}));

export const beneficiariesRelations = relations(beneficiaries, ({one, many}) => ({
	city: one(cities, {
		fields: [beneficiaries.cityId],
		references: [cities.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [beneficiaries.createdBy],
		references: [usersInAuth.id]
	}),
	idType: one(idTypes, {
		fields: [beneficiaries.idTypeId],
		references: [idTypes.id]
	}),
	cases: many(cases),
	beneficiaryDocuments: many(beneficiaryDocuments),
}));

export const citiesRelations = relations(cities, ({many}) => ({
	beneficiaries: many(beneficiaries),
}));

export const idTypesRelations = relations(idTypes, ({many}) => ({
	beneficiaries: many(beneficiaries),
}));

export const systemConfigRelations = relations(systemConfig, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [systemConfig.updatedBy],
		references: [usersInAuth.id]
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

export const usersRelations = relations(users, ({many}) => ({
	caseStatusHistories: many(caseStatusHistory),
	communications_recipientId: many(communications, {
		relationName: "communications_recipientId_users_id"
	}),
	communications_senderId: many(communications, {
		relationName: "communications_senderId_users_id"
	}),
	projects_assignedTo: many(projects, {
		relationName: "projects_assignedTo_users_id"
	}),
	projects_createdBy: many(projects, {
		relationName: "projects_createdBy_users_id"
	}),
	sponsorships: many(sponsorships),
	notifications: many(notifications),
	recurringContributions: many(recurringContributions),
	caseUpdates: many(caseUpdates),
	cases_assignedTo: many(cases, {
		relationName: "cases_assignedTo_users_id"
	}),
	cases_createdBy: many(cases, {
		relationName: "cases_createdBy_users_id"
	}),
	cases_sponsoredBy: many(cases, {
		relationName: "cases_sponsoredBy_users_id"
	}),
	contributions: many(contributions),
	contributionApprovalStatuses: many(contributionApprovalStatus),
	pushSubscriptions: many(pushSubscriptions),
	fcmTokens: many(fcmTokens),
	batchUploads: many(batchUploads),
	batchUploadItems: many(batchUploadItems),
	nicknameMappings_createdBy: many(nicknameMappings, {
		relationName: "nicknameMappings_createdBy_users_id"
	}),
	nicknameMappings_userId: many(nicknameMappings, {
		relationName: "nicknameMappings_userId_users_id"
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

export const projectsRelations = relations(projects, ({one, many}) => ({
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
	recurringContributions: many(recurringContributions),
	contributions: many(contributions),
}));

export const projectCyclesRelations = relations(projectCycles, ({one, many}) => ({
	project: one(projects, {
		fields: [projectCycles.projectId],
		references: [projects.id]
	}),
	contributions: many(contributions),
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

export const recurringContributionsRelations = relations(recurringContributions, ({one}) => ({
	case: one(cases, {
		fields: [recurringContributions.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [recurringContributions.donorId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [recurringContributions.projectId],
		references: [projects.id]
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

export const batchUploadsRelations = relations(batchUploads, ({one, many}) => ({
	cases: many(cases),
	contributions: many(contributions),
	user: one(users, {
		fields: [batchUploads.createdBy],
		references: [users.id]
	}),
	batchUploadItems: many(batchUploadItems),
}));

export const caseCategoriesRelations = relations(caseCategories, ({many}) => ({
	cases: many(cases),
	categoryDetectionRules: many(categoryDetectionRules),
}));

export const contributionsRelations = relations(contributions, ({one, many}) => ({
	batchUpload: one(batchUploads, {
		fields: [contributions.batchId],
		references: [batchUploads.id]
	}),
	case: one(cases, {
		fields: [contributions.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [contributions.donorId],
		references: [users.id]
	}),
	paymentMethod: one(paymentMethods, {
		fields: [contributions.paymentMethodId],
		references: [paymentMethods.id]
	}),
	projectCycle: one(projectCycles, {
		fields: [contributions.projectCycleId],
		references: [projectCycles.id]
	}),
	project: one(projects, {
		fields: [contributions.projectId],
		references: [projects.id]
	}),
	contributionApprovalStatuses: many(contributionApprovalStatus),
	batchUploadItems: many(batchUploadItems),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({many}) => ({
	contributions: many(contributions),
}));

export const contributionApprovalStatusRelations = relations(contributionApprovalStatus, ({one}) => ({
	user: one(users, {
		fields: [contributionApprovalStatus.adminId],
		references: [users.id]
	}),
	contribution: one(contributions, {
		fields: [contributionApprovalStatus.contributionId],
		references: [contributions.id]
	}),
}));

export const categoryDetectionRulesRelations = relations(categoryDetectionRules, ({one}) => ({
	caseCategory: one(caseCategories, {
		fields: [categoryDetectionRules.categoryId],
		references: [caseCategories.id]
	}),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [categoryDetectionRules.createdBy],
		references: [usersInAuth.id],
		relationName: "categoryDetectionRules_createdBy_usersInAuth_id"
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [categoryDetectionRules.updatedBy],
		references: [usersInAuth.id],
		relationName: "categoryDetectionRules_updatedBy_usersInAuth_id"
	}),
}));

export const beneficiaryDocumentsRelations = relations(beneficiaryDocuments, ({one}) => ({
	beneficiary: one(beneficiaries, {
		fields: [beneficiaryDocuments.beneficiaryId],
		references: [beneficiaries.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [beneficiaryDocuments.uploadedBy],
		references: [usersInAuth.id]
	}),
}));

export const siteActivityLogRelations = relations(siteActivityLog, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [siteActivityLog.userId],
		references: [usersInAuth.id]
	}),
}));

export const systemContentRelations = relations(systemContent, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [systemContent.updatedBy],
		references: [usersInAuth.id]
	}),
}));

export const userMergeBackupsRelations = relations(userMergeBackups, ({one}) => ({
	usersInAuth_adminUserId: one(usersInAuth, {
		fields: [userMergeBackups.adminUserId],
		references: [usersInAuth.id],
		relationName: "userMergeBackups_adminUserId_usersInAuth_id"
	}),
	usersInAuth_fromUserId: one(usersInAuth, {
		fields: [userMergeBackups.fromUserId],
		references: [usersInAuth.id],
		relationName: "userMergeBackups_fromUserId_usersInAuth_id"
	}),
	usersInAuth_toUserId: one(usersInAuth, {
		fields: [userMergeBackups.toUserId],
		references: [usersInAuth.id],
		relationName: "userMergeBackups_toUserId_usersInAuth_id"
	}),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({one}) => ({
	user: one(users, {
		fields: [pushSubscriptions.userId],
		references: [users.id]
	}),
}));

export const fcmTokensRelations = relations(fcmTokens, ({one}) => ({
	user: one(users, {
		fields: [fcmTokens.userId],
		references: [users.id]
	}),
}));

export const aiRulesRelations = relations(aiRules, ({one, many}) => ({
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [aiRules.createdBy],
		references: [usersInAuth.id],
		relationName: "aiRules_createdBy_usersInAuth_id"
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [aiRules.updatedBy],
		references: [usersInAuth.id],
		relationName: "aiRules_updatedBy_usersInAuth_id"
	}),
	aiRuleParameters: many(aiRuleParameters),
}));

export const aiRuleParametersRelations = relations(aiRuleParameters, ({one}) => ({
	aiRule: one(aiRules, {
		fields: [aiRuleParameters.ruleKey],
		references: [aiRules.ruleKey]
	}),
}));

export const batchUploadItemsRelations = relations(batchUploadItems, ({one}) => ({
	batchUpload: one(batchUploads, {
		fields: [batchUploadItems.batchId],
		references: [batchUploads.id]
	}),
	case: one(cases, {
		fields: [batchUploadItems.caseId],
		references: [cases.id]
	}),
	contribution: one(contributions, {
		fields: [batchUploadItems.contributionId],
		references: [contributions.id]
	}),
	user: one(users, {
		fields: [batchUploadItems.userId],
		references: [users.id]
	}),
}));

export const nicknameMappingsRelations = relations(nicknameMappings, ({one}) => ({
	user_createdBy: one(users, {
		fields: [nicknameMappings.createdBy],
		references: [users.id],
		relationName: "nicknameMappings_createdBy_users_id"
	}),
	user_userId: one(users, {
		fields: [nicknameMappings.userId],
		references: [users.id],
		relationName: "nicknameMappings_userId_users_id"
	}),
}));