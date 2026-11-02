
"use client";

import { useEffect, useState } from "react";

type Associate = {
    customerId: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: {
        roleName: string;
        assignmentType: string;
    }[];
};

export default function BusinessUnitAssociates() {
    const [associates, setAssociates] = useState<Associate[]>([]);
    const [businessUnitName, setBusinessUnitName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadAssociates() {
            try {
                const response = await fetch("/api/account/associates", {
                    cache: "no-store",
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message ?? "Failed to load associates");
                }

                setBusinessUnitName(data.businessUnit?.name ?? "");
                setAssociates(data.associates ?? []);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Something went wrong"
                );
            } finally {
                setLoading(false);
            }
        }

        loadAssociates();
    }, []);

    if (loading) return <p>Loading company associates...</p>;
    if (error) return <p role="alert">{error}</p>;

    if (!businessUnitName) {
        return <p>No Business Unit was found for your account.</p>;
    }

    return (
        <section className="space-y-4">
            <h2 className="text-xl font-semibold">
                Associates — {businessUnitName}
            </h2>

            {associates.length === 0 ? (
                <p>No associates found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="p-3">First name</th>
                            <th className="p-3">Last name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Assignment type</th>
                        </tr>
                        </thead>
                        <tbody>
                        {associates.map((associate) => (
                            <tr
                                key={associate.customerId}
                                className="border-b"
                            >
                                <td className="p-3">{associate.firstName}</td>
                                <td className="p-3">{associate.lastName}</td>
                                <td className="p-3">{associate.email}</td>
                                <td className="p-3">
                                    {associate.roles.length
                                        ? associate.roles
                                            .map((role) => role.roleName)
                                            .join(", ")
                                        : "No role assigned"}
                                </td>
                                <td className="p-3">
                                    {associate.roles.length
                                        ? associate.roles
                                            .map((role) => role.assignmentType)
                                            .join(", ")
                                        : "—"}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
