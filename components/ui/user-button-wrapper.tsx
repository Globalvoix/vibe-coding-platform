"use client";

import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { ChristmasCap } from './christmas-cap';

export function UserButtonWrapper(props: any) {
  return (
    <div className="relative inline-block">
      <ChristmasCap className="absolute -top-3 -right-2 w-6 h-6 z-10 -rotate-12 pointer-events-none" />
      <UserButton {...props} />
    </div>
  );
}
