import React from 'react';
import SetupBusinessView from './components/SetupBusiness';
import SetupPharmacy from './components/SetupPharmacy';

export default function SetupBusinessPage() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <SetupBusinessView />
      <SetupPharmacy />
    </div>
  );
}
