<template>
  <div class="p-6">
    <h2 class="text-3xl font-bold mb-6">User Guidelines & Role Information</h2>

    <!-- Role Information Section -->
    <div class="mb-8">
      <h3 class="text-2xl font-bold mb-4">Your Role: <span class="text-accent capitalize">{{ user?.role }}</span></h3>
      
      <!-- Admin Role -->
      <div v-if="user?.role === 'admin'" class="theme-info-box border-l-4 border-[color:var(--info)] p-6 mb-6">
        <h4 class="text-xl font-bold mb-3">
          <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          Administrator
        </h4>
        <p class="text-secondary mb-4">As an administrator, you have full access to all inventory management functions.</p>
        
        <div class="theme-card p-4">
          <p class="font-semibold mb-2">Your Permissions:</p>
          <ul class="space-y-2 text-secondary">
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 text-accent-subtle flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Manage all inventory items (Add, Edit, Delete)</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 text-accent-subtle flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Approve or reject borrowing requests</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 text-accent-subtle flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> View complete borrow history</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 text-accent-subtle flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Track lent-out items</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 text-accent-subtle flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> View audit logs of all system activities</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 text-accent-subtle flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Use Hand-Over Tool for status updates</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 text-accent-subtle flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Export data to Excel</li>
          </ul>
        </div>
      </div>

      <!-- Operator Role -->
      <div v-if="user?.role === 'operator'" class="border-l-4 p-6 mb-6 rounded-lg" style="background:var(--success-light);border-color:var(--success);">
        <h4 class="text-xl font-bold mb-3" style="color:var(--success-dark);">
          <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          Operator
        </h4>
        <p class="text-secondary mb-4">As an operator, you manage day-to-day inventory operations and request approvals.</p>
        
        <div class="theme-card p-4">
          <p class="font-semibold mb-2">Your Permissions:</p>
          <ul class="space-y-2 text-secondary">
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--success)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Manage inventory items (Add, Edit, Delete)</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--success)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Approve or reject borrowing requests</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--success)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> View complete borrow history</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--success)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Track lent-out items</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--success)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> View audit logs</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--success)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Use Hand-Over Tool for item status updates</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--success)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Export data to Excel</li>
          </ul>
        </div>
      </div>

      <!-- User Role -->
      <div v-if="user?.role === 'user'" class="border-l-4 p-6 mb-6 rounded-lg" style="background:var(--warning-light);border-color:var(--warning);">
        <h4 class="text-xl font-bold mb-3" style="color:var(--warning-dark);">
          <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          Regular User
        </h4>
        <p class="text-secondary mb-4">As a regular user, you can browse and request items for borrowing.</p>
        
        <div class="theme-card p-4">
          <p class="font-semibold mb-2">Your Permissions:</p>
          <ul class="space-y-2 text-secondary">
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--warning)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Search and browse available items</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--warning)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Submit borrowing requests</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--warning)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> View your borrowing history</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--warning)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Track your active borrows</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--warning)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Return items you borrowed</li>
            <li class="flex items-start"><svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style="color:var(--danger)" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg> Cannot manage items or approve requests</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Page Descriptions Section -->
    <div class="mb-8">
      <h3 class="text-2xl font-bold mb-4">
        <svg class="inline w-6 h-6 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        Page Descriptions
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Dashboard -->
        <div class="theme-card p-4">
          <h4 class="text-lg font-bold mb-2">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            Dashboard
          </h4>
          <p class="text-secondary text-sm mb-2">Your main hub showing inventory statistics and quick features overview.</p>
          <p class="field-label"><strong>Shows:</strong> Total items, available items, lent-out items, pending requests</p>
        </div>

        <!-- Search Available Items -->
        <div v-if="user?.role === 'user'" class="theme-card p-4">
          <h4 class="text-lg font-bold mb-2">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            Search Items
          </h4>
          <p class="text-secondary text-sm mb-2">Browse and search for items available for borrowing.</p>
          <p class="field-label"><strong>Features:</strong> Filter by category, location, view item details</p>
        </div>

        <!-- New Borrow Request -->
        <div v-if="user?.role === 'user'" class="theme-card p-4">
          <h4 class="text-lg font-bold mb-2">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            New Request
          </h4>
          <p class="text-secondary text-sm mb-2">Submit a new request to borrow an item from the inventory.</p>
          <p class="field-label"><strong>Features:</strong> Select item, specify reason, submit for approval</p>
        </div>

        <!-- My Borrowing Record -->
        <div v-if="user?.role === 'user'" class="theme-card p-4">
          <h4 class="text-lg font-bold mb-2">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            My Records
          </h4>
          <p class="text-secondary text-sm mb-2">View your complete borrowing history and active borrows.</p>
          <p class="field-label"><strong>Features:</strong> Track active items, view request status, return items</p>
        </div>

        <!-- Manage Items -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="theme-card p-4">
          <h4 class="text-lg font-bold mb-2">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Manage Items
          </h4>
          <p class="text-secondary text-sm mb-2">Add, edit, delete, and manage all inventory items with OCR invoice support.</p>
          <p class="field-label"><strong>Features:</strong> CRUD operations, import/export Excel, invoice OCR extraction</p>
        </div>

        <!-- Approve Requests -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="theme-card p-4">
          <h4 class="text-lg font-bold mb-2">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Approve Requests
          </h4>
          <p class="text-secondary text-sm mb-2">Review and approve or reject pending borrowing requests from users.</p>
          <p class="field-label"><strong>Features:</strong> Set return dates, reject with reasons, track approvals</p>
        </div>

        <!-- Borrow History -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="theme-card p-4">
          <h4 class="text-lg font-bold mb-2">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            Borrow History
          </h4>
          <p class="text-secondary text-sm mb-2">Complete record of all borrowing transactions in the system.</p>
          <p class="field-label"><strong>Shows:</strong> All past and current borrows, borrowers, return status</p>
        </div>

        <!-- Lent-Out Items -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="theme-card p-4">
          <h4 class="text-lg font-bold mb-2">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
            Lent-Out Items
          </h4>
          <p class="text-secondary text-sm mb-2">Track all items currently lent out to users with expected return dates.</p>
          <p class="field-label"><strong>Features:</strong> Filter items, view borrower info, track returns</p>
        </div>

        <!-- Hand-Over Tool -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="theme-card p-4">
          <h4 class="text-lg font-bold mb-2">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Hand-Over Tool
          </h4>
          <p class="text-secondary text-sm mb-2">Update item status when they are returned or transferred between locations.</p>
          <p class="field-label"><strong>Features:</strong> Mark items as returned, update status, confirm transactions</p>
        </div>

        <!-- Audit Log -->
        <div v-if="user?.role === 'admin' || user?.role === 'operator'" class="theme-card p-4">
          <h4 class="text-lg font-bold mb-2">
            <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            Audit Log
          </h4>
          <p class="text-secondary text-sm mb-2">Complete audit trail of all system activities and changes.</p>
          <p class="field-label"><strong>Shows:</strong> Who did what, when they did it, changes made</p>
        </div>
      </div>
    </div>

    <!-- Quick Tips Section -->
    <div class="theme-info-box border-l-4 border-[color:var(--info)] p-6">
      <h3 class="text-xl font-bold mb-4">
        <svg class="inline w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
        Quick Tips
      </h3>
      <ul class="space-y-3 text-secondary">
        <li class="flex items-start">
          <span class="text-accent font-bold mr-3">1.</span>
          <span><strong>Excel Export:</strong> Most pages have an "Export to Excel" button to download data for reporting.</span>
        </li>
        <li class="flex items-start">
          <span class="text-accent font-bold mr-3">2.</span>
          <span><strong>Item Search:</strong> Use filters by category and location to find items more easily.</span>
        </li>
        <li class="flex items-start">
          <span class="text-accent font-bold mr-3">3.</span>
          <span><strong>Invoice Upload:</strong> When adding items, invoice upload is required for tracking purposes.</span>
        </li>
        <li class="flex items-start">
          <span class="text-accent font-bold mr-3">4.</span>
          <span><strong>Request Status:</strong> Check "My Records" to track the status of your borrowing requests.</span>
        </li>
        <li class="flex items-start">
          <span class="text-accent font-bold mr-3">5.</span>
          <span><strong>Warranty Tracking:</strong> All items have warranty information tracked for maintenance planning.</span>
        </li>
        <li class="flex items-start">
          <span class="text-accent font-bold mr-3">6.</span>
          <span><strong>Hierarchical Items:</strong> Items can have a "Mother ID" if they are components of a larger system.</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { useAuth } from '../hooks/useAuth'

export default {
  setup() {
    const { user } = useAuth()

    return {
      user
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
