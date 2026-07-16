'use client';

import React, { useState } from 'react'
import AddUserWizard from './components/AddUserWizard'

const UserManagementPage = () => {
  const [isAddingUser, setIsAddingUser] = useState(false);

  return (
    <div className="flex flex-col gap-6 w-full">
      {!isAddingUser && (
        <div className="flex justify-between items-center w-full">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <button 
            onClick={() => setIsAddingUser(true)}
            className="bg-[#2D097A] text-white px-6 py-2 rounded-lg font-medium"
          >
            Add User
          </button>
        </div>
      )}

      {isAddingUser ? (
        <AddUserWizard onCancel={() => setIsAddingUser(false)} />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          No users found or table goes here. Click "Add User" to create one.
        </div>
      )}
    </div>
  )
}

export default UserManagementPage;