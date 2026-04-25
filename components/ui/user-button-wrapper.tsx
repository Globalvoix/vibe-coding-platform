"use client";

import React from 'react';
import { UserButton } from '@clerk/nextjs';

type UserButtonProps = React.ComponentProps<typeof UserButton>;

export function UserButtonWrapper(props: UserButtonProps) {
  return (
    <div className="relative inline-block mt-1">
      <UserButton {...props} />
    </div>
  );
}
