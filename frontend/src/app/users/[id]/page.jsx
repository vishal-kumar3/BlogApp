import Profile from '@/app/components/Profile.jsx'
import Header from '@/app/components/Header.jsx'
import React from 'react'


const page = ({params}) => {

  return (
    <div>
      <Profile id={params.id} />
    </div>
  )
}

export default page
