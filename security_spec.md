# Security Specification: Eagle Excel Wholesale Platform

## 1. Data Invariants
1. **User Role Integrity**: Regular customers cannot grant themselves the `admin` role upon registration or update. Roles can only be granted by existing administrators.
2. **Order Ownership**: An order's `userId` must strictly match the authenticated user's `uid` when created by a customer.
3. **Message Thread Privacy**: Customers can only read and write messages in support threads where they are the designated `customerId`.
4. **Product Modification**: Only verified administrators can create, update, or delete products and inventory counts in the catalog.
5. **Storage Media Isolation**: Image uploads to `products/{fileName}` are authorized for admins, and customer attachments to `attachments/{userId}/{fileName}` are restricted to authenticated users.

## 2. Access Control Model
- **Public**: Can read active product listings.
- **Customer (Authenticated)**:
  - Read/write own user profile (`users/{userId}` where `request.auth.uid == userId`)
  - Create and read own orders (`orders/{orderId}` where `resource.data.userId == request.auth.uid`)
  - Create and read own messages (`messages/{messageId}` where `resource.data.customerId == request.auth.uid`)
- **Admin**:
  - Full read/write access to all collections: `users`, `products`, `orders`, `messages`, `activity_logs`.
