# Technical Report: Multi-Tenant Database Architecture for SaaS Applications  

---

## **Abstract**

- Evaluates four multi-tenant database architecture patterns:
    - Shared Database with Shared Schema
    - Shared Database with Separate Schema
    - Separate Database
    - Pluggable Database
- Analyzes each pattern based on:
    - Schema Design
    - Performance & Scalability Considerations
    - Security & Data Isolation
    - Real-World Examples & Best Practices
- Provides recommendations for selecting the optimal architecture based on:
    - Tenant size
    - Compliance requirements
    - Operational complexity
- Includes:
    - Diagrams illustrating the designs.
    - Practical examples from real-world SaaS providers.
    - Schema design recommendations to support implementation.

---

## **Schema Design Approaches**

The following diagrams illustrate the four primary multi-tenant database architecture patterns:

---

### **1. Shared Database and Shared Schema (Pool Model)**  

<img src="https://pplx-res.cloudinary.com/image/upload/v1739085865/user_uploads/mLQqZuWqJGKETqn/Screenshot-from-2025-02-09-12-43-55.jpg" width="700" height="400" alt="Shared Database and Shared Schema Diagram">

#### **Schema Design**
- A single schema is shared by all tenants.
- Tenant data is identified using a `TenantID` column in each table.

#### **Performance & Scalability Considerations**
- **Advantages**:
  - Cost-efficient and simple to manage.
  - Scales well for small tenants.
  - Queries can be optimized using partitioning by `TenantID` and indexing on it.
- **Challenges**:
  - As the number of tenants grows, the single schema may become a bottleneck.

#### **Security & Data Isolation**
- Relies on application-level logic or Row-Level Security (RLS) to isolate tenant data.
- Encryption at rest and in transit is essential to prevent cross-tenant data leaks.

#### **Real-World Examples & Best Practices**
- Commonly used in SaaS applications targeting small businesses.
- Use composite indexes like `(TenantID, PrimaryKey)` to improve query performance.

---

### **2. Shared Database and Separate Schema (Bridge Model)**  

<img src="https://pplx-res.cloudinary.com/image/upload/v1739085865/user_uploads/NutfpsVJjrNtGWu/Screenshot-from-2025-02-09-12-50-07.jpg" width="700" height="400" alt="Shared Database and Shared Schema Diagram">

#### **Schema Design**
- Each tenant has its own schema within a shared database.
- Schemas are logically isolated but share the same database resources.

#### **Performance & Scalability Considerations**
- **Advantages**:
  - Better data isolation compared to shared schema.
  - Allows tenant-specific customizations at the schema level.
  - Scales well for medium-sized tenants.
- **Challenges**:
  - Increased complexity in schema management and migrations as the number of tenants grows.

#### **Security & Data Isolation**
- Logical isolation between schemas provides better security than a shared schema.
- Encryption at rest and in transit is still required for compliance.

#### **Real-World Examples & Best Practices**
- Used by applications requiring moderate isolation and customization.
- Automate schema creation and updates using tools like Flyway or Liquibase.

---

### **3. Pluggable Database (Introduced by Oracle)**  

![Pluggable Database](https://pplx-res.cloudinary.com/image/upload/v1739085865/user_uploads/JHtpxueNGEzLlZC/Screenshot-from-2025-02-09-12-50-51.jpg)

#### **Schema Design**
- A container database hosts multiple pluggable databases, each serving a tenant.

#### **Performance & Scalability Considerations**
- **Advantages**:
  - Combines benefits of separate databases with reduced overhead.
  - Simplifies management of multiple databases within a single container.
  - Scales efficiently while maintaining tenant isolation.
  
#### **Security & Data Isolation**
- Each pluggable database is isolated, ensuring strong security boundaries between tenants.

#### **Real-World Examples & Best Practices**
- Suitable for enterprises already using Oracle ecosystems or requiring centralized management of separate databases.

---

### **4. Separate Database (Silo Model)**  

![Separate Database](https://pplx-res.cloudinary.com/image/upload/v1739085865/user_uploads/RLpNAHKidOVJvET/Screenshot-from-2025-02-09-12-51-19.jpg)

#### **Schema Design**
Each tenant has its own dedicated database, ensuring full physical isolation of data.

#### **Performance & Scalability Considerations**
**Advantages**:
  - Maximum scalability and independence for each tenant.
  - Independent scaling and customization for each tenant's needs.
**Challenges**:
  - High operational cost due to resource usage per database.
  - Complex to manage at scale with many tenants.

#### **Security & Data Isolation**
Each tenant’s data is physically isolated, providing maximum security.  
Encryption at rest and in transit ensures compliance with regulations like GDPR or HIPAA.

#### **Real World Examples & Best Practices**
Used by enterprises in regulated industries requiring strict compliance.  
Best suited for premium customers needing dedicated resources.

---
## Example Schema Design Implementation

 Below is an example schema for a Shared Database with Shared Schema approach:
 
 ```SQL
 CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    product_name VARCHAR(255),
    amount DECIMAL(10, 2),
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

Queries can be scoped by `tenant_id`: `SELECT * FROM orders WHERE tenant_id = 1;
`

---

## Summary Table

| Design                             | Description                                                                                  | Advantages                                                                                  | Disadvantages                                                                                   | Use Case                                                                                         |
|------------------------------------|----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| Shared Database and Shared Schema (Pool Model) | All tenants share the same database and schema. Tenant data is identified using a `TenantID` column. | Cost-efficient and simple to manage.<br>Scales well for small tenants.                     | Limited data isolation; risk of cross-scope tenant leakage.<br>Limited customization options per tenant. | Best for SaaS applications targeting small businesses with similar requirements.                 |
| Shared Database and Separate Schema (Bridge Model) | Tenants share the same database but have separate schemas for their data.                   | Better data isolation compared.<br>Allows some tenant-specific customizations.              | Increased complexity in schema management.<br>Harder to scale as the number of tenants grows.   | Ideal for medium-sized tenants requiring moderate isolation and some customization.              |
| Pluggable Database (Container Model)           | A container database hosts multiple pluggable databases, each serving a tenant.             | Combines benefits of separate databases with reduced overhead.<br>Simplifies management of multiple databases in one container. | Requires Oracle-specific infrastructure, increasing costs.<br>Limited flexibility compared to fully separate databases. | Suitable for enterprises already using Oracle ecosystems or requiring centralized management of separate databases. |
| Separate Database (Silo Model)                | Each tenant has its own dedicated database.                                                 | Maximum data isolation and security.<br>Independent scaling and customization for each tenant. | High operational cost and resource usage.<br>Complex to manage at scale with many tenants.       | Best suited for large enterprises or regulated industries requiring strict compliance (e.g., GDPR, HIPAA). |

--- 

*End of Report*
