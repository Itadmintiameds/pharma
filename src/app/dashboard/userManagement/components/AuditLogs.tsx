import DataTable from "@/app/components/common/table/Table";
import React from "react";

interface AuditLogs {
  dateTime: string;
  user: string;
  action: string;
  details: string;
  ipAddress: string;
}

const auditLogs: AuditLogs[] = [
  {
    dateTime: "14 May 2004, 10:15 AM",
    user: "Rahul Sharma",
    action: "Password Reset",
    details: "Password reset for user Rahul Sharma",
    ipAddress: "192.168.1.45",
  },
  {
    dateTime: "15 May 2004, 10:15 AM",
    user: "Priya Shetty",
    action: "Role Updated",
    details: "Role Store Manager updated",
    ipAddress: "192.168.1.47",
  },
  {
    dateTime: "16 May 2004, 10:15 AM",
    user: "Priya Shetty",
    action: "User Created",
    details: "New user account created",
    ipAddress: "192.168.1.49",
  },
];

const AuditLogs = () => {
  const columns = [
    {
      key: "dateTime",
      header: "Date & Time",
    },
    {
      key: "user",
      header: "User",
    },
    {
      key: "action",
      header: "Action",
    },

    {
      key: "details",
      header: "Details",
    },
    {
      key: "ipAddress",
      header: "IP Address",
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={auditLogs}
        page={1}
        pageSize={7}
        totalItems={128}
        onPageChange={(page) => console.log(page)}
      />
    </>
  );
};

export default AuditLogs;
