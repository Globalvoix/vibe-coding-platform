"use client";

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { ChristmasCap } from './christmas-cap';

type UserButtonProps = React.ComponentProps<typeof UserButton>;

export function UserButtonWrapper(props: UserButtonProps) {
  return (
    <div className="relative inline-block mt-1">
      <ChristmasCap className="absolute -top-3.5 -left-1.5 w-6 h-6 z-10 -rotate-[20deg] drop-shadow-sm pointer-events-none" />
      <UserButton {...props} />
    </div>
  );
}
