import React from 'react'
import UserDetails from './components/UserDetails'
import AddUserWizard from './components/AddUserWizard'

const page = () => {
  return (
  <>
    <div>UserManagement</div>
    <div>
      <UserDetails/>
      <AddUserWizard/>
    </div>
  </>
  )
}

export default page