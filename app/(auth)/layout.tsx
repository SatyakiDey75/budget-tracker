import Logo from '@/components/logo';
import React from 'react';

function layout({ children } : { children: React.ReactNode }) {
  return (
    <div className='relative flex h-screen w-full flex-col items-center justify-center'>
        <Logo />
        <div className="mt-12">{children}</div>
    </div>
  )
}

export default layout;