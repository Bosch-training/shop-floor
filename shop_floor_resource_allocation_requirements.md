# Shop-Floor Resource Allocation System
## Software Requirements Specification (SRS)

**Version:** 1.0  
**Status:** Draft for MVP  
**Use case:** Assign and adjust operators, machines, and materials for manufacturing work orders to reduce idle time.

---

## 1. Purpose

The Shop-Floor Resource Allocation System enables manufacturing supervisors to allocate available operators, machines, and materials to work orders, monitor allocation status, and make changes when shop-floor conditions change.

The MVP focuses on reliable manual allocation, conflict prevention, visibility of resource availability, and quick reallocation. Automated optimization is out of scope for this version.

## 2. Problem Statement

Supervisors may use spreadsheets, boards, or verbal coordination to manage work-order resources. This can lead to resource conflicts, avoidable idle time, delayed work, and limited visibility into why a work order cannot start.

The system will provide one place to view work orders and resources, create allocations, detect conflicts, and update allocations as conditions change.

## 3. Goals and Success Measures

### Goals
- Reduce avoidable idle time caused by missing or incorrectly allocated resources.
- Prevent the same operator or machine from being allocated to overlapping work.
- Make material shortages and resource conflicts visible before a work order is started.
- Allow supervisors to reassign resources with minimal steps.
- Maintain a history of allocation changes.

### MVP success measures
- A supervisor can create, update, and cancel an allocation.
- The system blocks conflicting operator and machine allocations.
- The system identifies insufficient material availability.
- Each allocation change records who changed it and when.
- A supervisor can identify why a work order is not ready to start.

No numeric idle-time reduction target is imposed until baseline shop-floor data is available.

## 4. Scope

### In scope
- Maintain basic records for operators, machines, materials, and work orders.
- Record resource availability and work-order requirements.
- Assign operators, machines, and material quantities to work orders.
- Validate resource eligibility, availability, and time overlap.
- Show allocation status and readiness.
- Modify or release allocations.
- Record an audit history of allocation changes.
- Display basic work-order and resource views.

### Out of scope for MVP
- AI-based or automatic schedule optimization.
- Predictive maintenance and machine telemetry integration.
- ERP/MES integration.
- Payroll, attendance, purchasing, and supplier management.
- Automatic material replenishment.
- Multi-factory planning.
- Mobile application and offline operation.

## 5. Users and Roles

| Role | Permissions |
|---|---|
| Manufacturing Supervisor | View resources and work orders; create, change, and release allocations |
| Shop-Floor Operator | View assigned work orders and their own assignments; cannot change allocations |
| Administrator | Create and update master data; manage users and roles |

The MVP assumes authenticated users. Role-based access must be enforced by the application, not only by hiding interface controls.

## 6. Key Definitions

- **Work order:** A production task with a required quantity, planned time window, and resource requirements.
- **Allocation:** The assignment of one or more resources to a work order for a planned period.
- **Resource:** An operator, machine, or material.
- **Conflict:** An assignment that violates resource availability, eligibility, capacity, or time-overlap rules.
- **Ready to start:** A work order whose required operator and machine are assigned and eligible, and whose required materials are available in sufficient quantity.

## 7. Functional Requirements

### FR-01: Manage resource records
The system shall allow an Administrator to create, view, update, and deactivate operator and machine records.

Each operator record shall include a unique ID, name, skills or qualifications, and availability status.

Each machine record shall include a unique ID, name, machine type or capability, and availability status.

The system shall prevent deactivation of a resource that has an active allocation unless the allocation is first released or reassigned.

### FR-02: Manage material availability
The system shall allow an Administrator to record each material's unique ID, name, unit of measure, and available quantity.

The system shall allow authorized users to update the available quantity.

The system shall reject negative material quantities.

### FR-03: Manage work orders
The system shall allow an authorized user to create, view, update, and cancel work orders.

Each work order shall include:
- Unique work-order ID
- Product or job description
- Required production quantity
- Planned start and end time
- Required machine capability or machine type
- Required operator skill or qualification
- Required materials and quantities
- Status: Draft, Ready, In Progress, Blocked, Completed, or Cancelled

The system shall reject a planned end time that is earlier than or equal to the planned start time.

### FR-04: View resource availability
The system shall display operators, machines, and materials with their current availability or quantity.

For operators and machines, the system shall show existing allocations that overlap the selected work-order time window.

For materials, the system shall show available quantity and the quantity required by the selected work order.

### FR-05: Allocate resources
The system shall allow a Manufacturing Supervisor to assign one or more eligible operators, one or more compatible machines, and the required materials to a work order.

Before saving an allocation, the system shall validate:
- Resource is active and available.
- Operator has the required skill or qualification.
- Machine supports the required capability.
- Operator and machine have no conflicting allocation during the planned time window.
- Sufficient material quantity is available.
- Required fields and time values are valid.

If validation fails, the system shall not save the invalid allocation and shall display a clear reason for each failed check.

### FR-06: Prevent overlapping assignments
The system shall prevent an operator or machine from being allocated to two work orders whose planned time windows overlap.

A time window is considered overlapping when the start of one allocation is earlier than the end of the other and the end of the first is later than the start of the other.

Back-to-back allocations are allowed when one allocation ends exactly when the next begins.

The system shall revalidate conflicts when an allocation is created or changed, including when two supervisors attempt changes at nearly the same time.

### FR-07: Check work-order readiness
The system shall calculate and display whether a work order is Ready to start or Blocked.

A work order shall be Ready to start only when all required operators and machines are assigned and eligible, and all required materials are available in sufficient quantity.

For a Blocked work order, the system shall display the outstanding reasons, such as missing operator, incompatible machine, overlapping assignment, or insufficient material.

### FR-08: Adjust allocations
The system shall allow a Manufacturing Supervisor to change an assigned operator, machine, material quantity, or planned time window.

The system shall validate the proposed changes before applying them.

If the change is invalid, the system shall preserve the existing allocation and display the reason for rejection.

### FR-09: Release allocations
The system shall allow a Manufacturing Supervisor to release an allocation when it is no longer needed.

Released operator and machine assignments shall become available for other work orders, subject to their other allocations and availability status.

Released material quantities shall be returned to available stock if they had been reserved by the system.

### FR-10: Update work-order status
The system shall allow authorized users to move a work order through the supported lifecycle.

The system shall not allow a Blocked work order to move to In Progress.

The system shall not allow a Completed or Cancelled work order to receive new active allocations.

The system shall release remaining active allocations when a work order is cancelled, while preserving the audit history.

### FR-11: Allocation overview
The system shall provide a dashboard or list view showing:
- Work-order ID and status
- Planned start and end time
- Assigned operators and machines
- Material readiness
- Blocked reasons
- Unallocated or idle resources

The user shall be able to filter by work-order status, resource type, and planned time window.

### FR-12: Audit history
The system shall record each allocation creation, update, and release with:
- Work-order ID
- Resource and allocation details before and after the change, where applicable
- Action performed
- User who performed the action
- Timestamp
- Reason for the change, when provided

Audit entries shall not be editable by ordinary users.

### FR-13: User feedback and errors
The system shall display a success message after a valid change is saved.

For rejected changes, the system shall identify the specific validation rule that failed and suggest what must be corrected where practical.

The system shall not silently discard a user's changes.

## 8. Business Rules

- **BR-01:** Every work order and resource must have a unique ID.
- **BR-02:** Only active resources may receive new allocations.
- **BR-03:** Operators must meet the work order's required skill or qualification.
- **BR-04:** Machines must match the work order's required capability.
- **BR-05:** An operator or machine cannot have overlapping active allocations.
- **BR-06:** Required material quantities must be available before a work order can start.
- **BR-07:** Material reservation and release must not result in negative available stock.
- **BR-08:** Invalid allocation changes must not partially update the work order or its resources.
- **BR-09:** Work-order status and allocation state must remain consistent.
- **BR-10:** Allocation changes must be auditable.
- **BR-11:** Work orders use one configured plant time zone.
- **BR-12:** For the MVP, supervisors make allocation decisions manually; the system validates but does not automatically choose the optimal allocation.

## 9. Non-Functional Requirements

- **NFR-01 Usability:** A supervisor shall be able to create a basic allocation using the interface without technical assistance.
- **NFR-02 Performance:** For a typical MVP dataset, common list and allocation-validation operations should complete within 2 seconds under normal load.
- **NFR-03 Reliability:** A failed allocation save shall not leave partial resource assignments or material reservations.
- **NFR-04 Security:** The system shall authenticate users and enforce role-based permissions.
- **NFR-05 Auditability:** Allocation changes shall be retained in a timestamped audit log.
- **NFR-06 Data integrity:** Resource IDs, work-order IDs, quantities, and time windows shall be validated on the server side.
- **NFR-07 Concurrency:** Concurrent allocation requests shall not be able to bypass conflict or material-quantity validation.
- **NFR-08 Maintainability:** Validation rules shall be implemented consistently and covered by automated tests.
- **NFR-09 Compatibility:** The MVP shall support current versions of major desktop browsers.
- **NFR-10 Privacy:** The system shall store only user information needed for authentication, authorization, and audit.

## 10. Core Data Entities

| Entity | Key fields |
|---|---|
| Operator | operator_id, name, skills, status |
| Machine | machine_id, name, capabilities, status |
| Material | material_id, name, unit, available_quantity |
| Work Order | work_order_id, description, quantity, planned_start, planned_end, status |
| Work Order Requirement | work_order_id, resource_type, skill/capability/material_id, required_quantity |
| Allocation | allocation_id, work_order_id, resource_id, resource_type, start_time, end_time, quantity, status |
| User | user_id, name, role, status |
| Audit Event | event_id, actor_id, action, work_order_id, before_value, after_value, timestamp, reason |

Implementation note: The data model should distinguish material reservations from physical stock adjustments if the system later needs stock movement or inventory reconciliation.

## 11. Main Workflow

1. Administrator configures operators, machines, and materials.
2. An authorized user creates a work order with a time window and resource requirements.
3. Supervisor opens the allocation view and reviews available resources.
4. Supervisor selects operators, machines, and material quantities.
5. System validates skills, capabilities, availability, time conflicts, and material quantity.
6. If validation passes, the system saves the allocation and updates readiness.
7. If conditions change, the supervisor edits or releases allocations.
8. The system validates the change and records the audit event.
9. Supervisor monitors blocked work orders and available resources through the overview.

## 12. Acceptance Criteria

### AC-01: Successful allocation
**Given** an active work order and eligible, available resources  
**When** a supervisor allocates a qualified operator, compatible machine, and sufficient materials  
**Then** the allocation is saved and the work order becomes Ready to start.

### AC-02: Operator conflict
**Given** an operator is allocated to a work order from 09:00 to 11:00  
**When** a supervisor attempts to allocate that operator to another work order from 10:00 to 12:00  
**Then** the system rejects the second allocation and explains the time conflict.

### AC-03: Back-to-back allocation
**Given** an operator is allocated from 09:00 to 10:00  
**When** a supervisor allocates the same operator from 10:00 to 11:00  
**Then** the system allows the allocation if all other checks pass.

### AC-04: Machine incompatibility
**Given** a work order requires a machine with a specified capability  
**When** the supervisor selects a machine without that capability  
**Then** the system rejects the allocation and identifies the incompatibility.

### AC-05: Insufficient materials
**Given** a work order requires 20 units of a material and only 15 are available  
**When** the supervisor attempts to reserve 20 units  
**Then** the system rejects the reservation and displays the available and required quantities.

### AC-06: Failed reallocation preserves current state
**Given** a work order has a valid current allocation  
**When** a supervisor attempts to replace its machine with an unavailable machine  
**Then** the change is rejected and the existing allocation remains unchanged.

### AC-07: Release resource
**Given** a work order has an active operator and machine allocation  
**When** a supervisor releases the allocation  
**Then** those resources become available for other non-conflicting work and the release is audited.

### AC-08: Blocked work order
**Given** a work order is missing a required operator  
**When** the supervisor views the work order  
**Then** the work order is marked Blocked and the missing operator is listed as a reason.

### AC-09: Role permissions
**Given** a user has the Shop-Floor Operator role  
**When** the user attempts to change an allocation  
**Then** the system denies the action and leaves the allocation unchanged.

### AC-10: Audit history
**Given** a supervisor successfully changes an allocation  
**When** the supervisor views the work order's history  
**Then** the history shows the actor, timestamp, action, and before/after details.

### AC-11: Concurrent allocation
**Given** two supervisors attempt to allocate the same machine to overlapping time windows  
**When** both requests are submitted nearly simultaneously  
**Then** no more than one conflicting allocation is committed.

### AC-12: Cancel work order
**Given** a work order has active allocations  
**When** an authorized user cancels the work order  
**Then** the work order is marked Cancelled, active allocations are released, and the history is retained.

## 13. Suggested MVP Test Areas

- Valid and invalid resource assignments
- Operator skill and machine capability checks
- Overlapping, adjacent, and invalid time windows
- Material reservation, release, and insufficient stock
- Allocation update and rollback on failure
- Work-order lifecycle and cancellation
- Role-based access control
- Audit history completeness
- Concurrent allocation attempts
- Filtering and dashboard accuracy
- Input validation and server-side enforcement

## 14. Assumptions and Open Questions

### Assumptions
- The MVP serves one manufacturing site.
- Supervisors allocate resources manually.
- Work-order time windows are planned times, not live machine telemetry.
- Material quantities are maintained in the system and updated by authorized users.
- A work order requires at least one operator and one machine unless its configuration explicitly says otherwise.

### Open questions for stakeholders
1. Can multiple operators or machines be assigned to one work order at the same time?
2. Should material be reserved when allocated, or consumed only when production starts?
3. Should operator availability be entered manually or imported from shift/attendance data?
4. Are machine maintenance windows required in the MVP?
5. Can supervisors override validation rules, and if so, which rules require approval?
6. Should the system support priority-based scheduling or recommendations in a later release?
7. What baseline and target should be used to measure idle-time reduction?

## 15. MVP Definition of Done

The MVP is complete when:
- All in-scope functional requirements are implemented.
- Acceptance criteria AC-01 through AC-12 pass.
- Invalid allocations are rejected without partial updates.
- Role permissions and audit history are verified.
- Automated tests cover core validation and allocation workflows.
- Setup instructions and user guidance are available.
- Known limitations and unresolved stakeholder decisions are documented.
