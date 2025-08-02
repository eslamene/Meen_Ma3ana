# Meen-Ma3ana Charity Case Management Platform - Business Requirements Document (BRD)

## 1. Introduction

### 1.1. Project Overview
"Meen-Ma3ana" is a comprehensive charity platform designed to help people in need through community-driven financial support. The application serves as a centralized platform where administrators create charity cases (one-time or recurring) and recurring projects for individuals or families requiring assistance. Donors contribute through financial shares to help reach case goals, with support for ongoing monthly assistance and cyclic project-based fundraising. The system will be built using Supabase as the backend, providing a robust and scalable foundation.

### 1.2. Goals and Objectives
- To provide a transparent platform for helping people in need through organized charity cases and recurring projects.
- To offer powerful tools for administrators to create, manage, and monitor one-time and recurring charity cases.
- To support ongoing assistance through recurring cases for continuous needs (medical supplies, life support, rent).
- To enable cyclic project-based fundraising through recurring projects with defined contribution cycles.
- To ensure accountability and transparency in the charity process through proof-based donations.
- To facilitate community support through open or predefined financial contributions.
- To leverage Supabase for authentication, database management, and storage.

### 1.3. Scope
- **In Scope:**
    - User authentication (donors, administrators).
    - Creation and management of charity cases (one-time, recurring) with supporting documentation.
    - Recurring project management with cycle-based fundraising.
    - Case-based financial contribution system with automatic closure.
    - Direct sponsorship system with admin-approved connections.
    - Proof-based donation system with admin moderation.
    - Offline payment recording capabilities.
    - Sponsor-beneficiary communication platform with oversight.
    - Automated recurring case period and project cycle management.
    - Real-time case/project progress tracking and reporting.
    - Automatic case reopening when sponsorship ends.
- **Out of Scope:**
    - Direct payment processing (donors provide proof of external payments).
    - Volunteer and event management (can be considered for future versions).
    - Direct integration with third-party accounting software.

### 1.4. Target Audience
- **Donors:** Individuals and organizations looking to help people in need through financial contributions.
- **Sponsors:** Dedicated donors who want to take direct responsibility for supporting specific cases through ongoing sponsorship relationships.
- **Administrators:** Staff responsible for creating and managing charity cases, moderating donations, and facilitating sponsorship connections.

## 2. Functional Requirements

### 2.1. User Management
- **User Roles:** Donor, Sponsor, Admin.
- **Authentication:** Secure user registration and login using Supabase Auth, including social login options.
- **Profile Management:** Users can manage their personal information and view their:
    - Contribution history and case participation
    - Active and historical sponsorship relationships (for sponsors)
    - Sponsorship requests and approval status
    - Communication logs with beneficiaries (for sponsors)
- **Sponsor Verification:** Enhanced profile verification process for potential sponsors to ensure legitimacy and commitment capability

### 2.2. Case Management
- **One-Time Cases:** Standard charity cases with the following required information:
    - Case name and detailed description
    - Supporting files and documentation (images, documents, medical reports, etc.)
    - Desired financial amount needed
    - Case start date
    - Case status tracking (Active, Closed, Under Review)
- **Recurring Cases:** Ongoing support cases for people with continuous needs:
    - Monthly or custom period-based support (weekly, bi-weekly, quarterly)
    - Suitable for medical supplies, life support, rent, or other recurring expenses
    - Automatic monthly case generation based on defined schedule
    - Individual monthly targets that reset each period
    - Long-term case tracking with historical period performance
- **Case Lifecycle:** 
    - One-time cases automatically close when the total contributed amount reaches the desired amount
    - Recurring cases continue generating new periods until manually stopped by admin
- **Case Browsing:** Donors can browse, search, and filter active cases by type (one-time, recurring) and availability (open for public contributions, open for sponsorship, sponsored) to find causes they want to support
- **Case Updates:** Admins can update case information and add progress updates for all case types
- **Case Sponsorship System:**
    - Cases can be marked as "open for sponsorship" allowing donors to request to become dedicated sponsors
    - Sponsors take full responsibility for supporting specific cases directly
    - Admin approval required for sponsor-case connections
    - Direct contact sharing between sponsor and case beneficiary upon approval
    - Sponsored cases are removed from public contribution listings
    - Option to reopen cases for public contributions if sponsorship ends

### 2.3. Recurring Project Management
- **Recurring Projects:** Cyclic project-based fundraising with the following characteristics:
    - Project-based structure with multiple funding cycles
    - Each cycle has a defined start date and end date
    - Monthly contribution collection within each cycle period
    - Goal achievement through accumulated contributions across multiple cycles
    - Automatic cycle progression upon completion or time expiration
- **Cycle Management:**
    - Admin-defined cycle duration and frequency
    - Individual cycle targets and overall project goals
    - Cycle status tracking (Active, Completed, Failed, Upcoming)
    - Automatic cycle closure and new cycle generation
- **Project Lifecycle:**
    - Projects can run indefinitely through multiple cycles
    - Admin control to pause, modify, or terminate recurring projects
    - Historical tracking of all completed cycles and their performance
- **Cycle-Based Contributions:**
    - Contributors can support specific cycles or commit to multiple cycles
    - Monthly contribution schedules within active cycles
    - Cycle-specific progress tracking and reporting

### 2.4. Sponsorship Management
- **Sponsorship Requests:** Donors can request to sponsor specific cases directly
- **Admin Approval Process:** 
    - Review sponsorship requests and donor profiles
    - Approve or reject sponsor-case connections
    - Facilitate contact information exchange between approved sponsors and case beneficiaries
- **Sponsorship Monitoring:**
    - Track sponsor-case relationship status and duration
    - Monitor feedback from both sponsors and case beneficiaries
    - Document communication and support progress
    - Set review periods for ongoing sponsorships
- **Sponsorship Lifecycle Management:**
    - Active sponsorship tracking with regular check-ins
    - Handle sponsor withdrawal requests
    - Manage sponsorship termination process
    - Automatic case reopening for public contributions when sponsorship ends
- **Multi-Case Sponsorship:** Allow sponsors to support multiple cases simultaneously
- **Sponsorship Communication Hub:** Secure messaging platform for sponsor-beneficiary communication with admin oversight

### 2.5. Contribution Management
- **Proof-Based Donations:** Donors submit financial contributions by providing proof of payment as file attachments
- **Contribution Types:** Support for both open amounts (donor chooses amount) and predefined amounts (suggested contribution levels)
- **Admin Moderation:** All submitted donation proofs are subject to admin review and confirmation before being counted toward case goals
- **Offline Payment Recording:** Admins can quickly record payments received through offline channels (cash, bank transfers, etc.)
- **Contribution Tracking:** Real-time tracking of total contributions per case/project with automatic closure when target is reached
- **Recurring Contribution Support:** 
    - Support for recurring case period contributions
    - Project cycle-based contribution tracking
    - Automatic period/cycle transitions and contribution carryover
- **Sponsorship vs. Public Contributions:**
    - Clear distinction between sponsored cases and publicly funded cases
    - Sponsored cases bypass regular contribution tracking
    - Public contribution system remains active for non-sponsored cases

### 2.6. Reporting and Analytics
- **Admin Dashboard:** Real-time analytics showing:
    - Active cases (one-time, recurring) and their progress by funding type (public, sponsored)
    - Active project cycles and recurring project performance
    - Active sponsorships and their status
    - Total contributions processed and pending moderation
    - Case/project completion rates and average time to closure
    - Donor activity and contribution patterns
    - Sponsorship success rates and duration analytics
    - Recurring case period performance and trends
    - Project cycle success rates and progression analytics
- **Case Reports:** Detailed reports for individual cases including:
    - All contributions, supporting documents, and case timeline
    - Sponsorship history and current sponsor information
    - Recurring case historical period performance
    - Monthly/period-based contribution breakdowns
    - Sponsor-beneficiary communication logs and feedback
- **Project Reports:** Comprehensive project cycle reporting including:
    - Individual cycle performance and contribution details
    - Multi-cycle project progression and goal achievement
    - Cycle-to-cycle comparison and trend analysis
- **Sponsorship Reports:** Dedicated sponsorship analytics including:
    - Active sponsorship relationships and their duration
    - Sponsor performance and engagement metrics
    - Case transition from public to sponsored and back to public
    - Feedback analysis from sponsors and beneficiaries
    - Sponsorship renewal and termination patterns
- **Financial Reports:** Export capabilities for:
    - Contribution summaries by case type (one-time, recurring, project-based) and funding method (public, sponsored)
    - Period-based financial breakdowns for recurring cases
    - Cycle-based financial reports for recurring projects
    - Sponsorship financial tracking and accountability reports
    - Donor information for transparency and accounting purposes

## 3. Non-Functional Requirements

### 3.1. Performance
- The application will be optimized for fast loading times and a responsive user experience.

### 3.2. Scalability
- The architecture will be designed to handle a growing number of users and transactions.

### 3.3. Security
- Implementation of best security practices, including data encryption and secure authentication, leveraging Supabase's built-in security features like Row Level Security.

### 3.4. Usability
- A clean, intuitive, and mobile-responsive user interface.

## 4. System Requirements

### 4.1. Frontend
- A modern JavaScript framework (e.g., React, Vue.js) for a dynamic user experience.

### 4.2. Backend
- **Supabase:**
    - **Database:** PostgreSQL for data storage including:
        - Cases (one-time, recurring) with period tracking and sponsorship status
        - Recurring projects with cycle management
        - Contributions linked to specific periods/cycles
        - User profiles and moderation records
        - Sponsorship relationships and approval records
        - Sponsor-beneficiary communication logs and feedback
        - Historical period/cycle performance data
        - Case transition history (public ↔ sponsored)
    - **Authentication:** Supabase Auth for user management and role-based access control.
    - **Storage:** Supabase Storage for:
        - Case supporting documents (images, medical reports, legal documents)
        - Donation proof attachments (payment receipts, transfer confirmations)
        - User avatars and profile images
    - **Edge Functions:** For custom server-side logic including:
        - Automatic case closure when target amount is reached
        - Contribution validation and approval workflows
        - Notification systems for case updates and approvals
        - Sponsorship request processing and approval workflows
        - Automatic case reopening when sponsorship ends
        - Sponsor-beneficiary communication facilitation
        - Recurring case period generation and management
        - Project cycle automation and progression
        - Scheduled tasks for period/cycle transitions
        - Sponsorship monitoring and review scheduling
        - Automated reporting and analytics updates
    - **Row Level Security:** To ensure proper access control for sensitive case information and financial data.

## 5. Assumptions and Constraints

### 5.1. Assumptions
- Donors will use external payment methods and provide proof of payment as attachments.
- Sponsors will handle direct financial support through their own preferred payment methods.
- Admins will have the capacity to moderate and verify donation proofs and manage sponsorship approvals in a timely manner.
- All necessary case documentation and supporting files will be provided by case creators.
- Sponsors and beneficiaries will engage in constructive communication and provide regular feedback.
- Users will have access to devices capable of uploading files (proof of payments, case documents).
- Contact information sharing between sponsors and beneficiaries is acceptable to both parties.

### 5.2. Constraints
- The project will be developed using the specified technology stack (Supabase backend).
- The platform will not directly process payments but rely on proof-based verification system.
- File upload sizes will be limited by Supabase Storage constraints.
- The initial development will focus on the features outlined in this BRD.
- Admin moderation is required for all contributions and sponsorship approvals, which may introduce processing delays.
- Contact information sharing in sponsorship requires careful privacy and security considerations.
- Sponsorship communication monitoring adds complexity to data management and privacy compliance.
- Recurring case and project management adds complexity to data structure and automation requirements.
- Automated period/cycle transitions depend on reliable scheduling mechanisms within Supabase Edge Functions.
- Sponsorship relationship management requires robust workflow systems for approval, monitoring, and termination processes. 