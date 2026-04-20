-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "estate" TEXT;

-- CreateIndex
CREATE INDEX "AttendanceRecord_sessionId_idx" ON "AttendanceRecord"("sessionId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_memberId_idx" ON "AttendanceRecord"("memberId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_status_idx" ON "AttendanceRecord"("status");

-- CreateIndex
CREATE INDEX "HomeFellowship_name_idx" ON "HomeFellowship"("name");

-- CreateIndex
CREATE INDEX "Member_homeFellowshipId_idx" ON "Member"("homeFellowshipId");

-- CreateIndex
CREATE INDEX "Member_fullName_idx" ON "Member"("fullName");

-- CreateIndex
CREATE INDEX "Member_gender_idx" ON "Member"("gender");

-- CreateIndex
CREATE INDEX "MemberDepartment_memberId_idx" ON "MemberDepartment"("memberId");

-- CreateIndex
CREATE INDEX "MemberDepartment_departmentId_idx" ON "MemberDepartment"("departmentId");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_transactionDate_idx" ON "Transaction"("transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_reference_idx" ON "Transaction"("reference");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
