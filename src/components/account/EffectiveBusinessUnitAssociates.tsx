"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { EffectiveBusinessUnitAssociate } from "@/lib/associate-roles";

type Associate = EffectiveBusinessUnitAssociate & {
    isCurrentUser: boolean;
};

type AssociateData = {
    associates: Associate[];
    roles: { key: string; name: string; buyerAssignable: boolean }[];
    canManageAssociates: boolean;
};

type Filter = "All" | "Explicit" | "Inherited";

export default function EffectiveBusinessUnitAssociates({
    businessUnitId,
}: {
    businessUnitId: string;
}) {
    const t = useTranslations("associates");
    const [data, setData] = useState<AssociateData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<Filter>("All");
    const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
    const [selectedRoleKeys, setSelectedRoleKeys] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const fetchAssociates = useCallback(async (signal?: AbortSignal) => {
        const response = await fetch(
            `/api/business-units/${encodeURIComponent(businessUnitId)}/associates`,
            { cache: "no-store", signal },
        );
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || t("loadError"));
        }
        return result as AssociateData;
    }, [businessUnitId, t]);

    useEffect(() => {
        const controller = new AbortController();
        fetchAssociates(controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) {
                    setData(result);
                }
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                    setError(reason instanceof Error ? reason.message : t("loadError"));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [fetchAssociates, t]);

    async function submitChange(customerId: string, method: "PATCH" | "DELETE") {
        setSaving(true);
        setError("");
        try {
            const response = await fetch(
                `/api/business-units/${encodeURIComponent(businessUnitId)}/associates`,
                {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customerId,
                        ...(method === "PATCH" && { roleKeys: selectedRoleKeys }),
                    }),
                },
            );
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || t("updateError"));
            }
            setEditingCustomerId(null);
            setData(await fetchAssociates());
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : t("updateError"));
        } finally {
            setSaving(false);
        }
    }

    const visibleAssociates = (data?.associates ?? []).filter((associate) => {
        if (filter === "All") return true;
        return associate.assignmentType === filter || associate.assignmentType === "Both";
    });

    const assignmentBadgeClasses = {
        Explicit: "bg-blue-100 text-blue-800",
        Inherited: "bg-purple-100 text-purple-800",
        Both: "bg-indigo-100 text-indigo-800",
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">
                    {t("title")}{" "}
                    <span className="text-sm font-normal text-gray-500">
                        ({data?.associates.length ?? 0})
                    </span>
                </h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterLabel")}>
                    {(["All", "Explicit", "Inherited"] as const).map((value) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={filter === value}
                            onClick={() => setFilter(value)}
                            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                                filter === value
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            {t(value.toLowerCase())}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
                {loading ? (
                    <div className="p-6 text-sm text-gray-500" role="status">{t("loading")}</div>
                ) : !data ? null : data.associates.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500">{t("empty")}</div>
                ) : visibleAssociates.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500">{t("noFilterResults")}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {["name", "email", "roles", "assignmentType", "actions"].map((key) => (
                                        <th
                                            key={key}
                                            className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600"
                                        >
                                            {t(key)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {visibleAssociates.map((associate) => {
                                    const explicitRoles = associate.roles
                                        .filter((role) => role.assignmentType === "Explicit")
                                        .map((role) => role.roleKey);
                                    const canEdit =
                                        data?.canManageAssociates && explicitRoles.length > 0;
                                    const isEditing = editingCustomerId === associate.customerId;
                                    return (
                                        <tr key={associate.customerId} className="align-top hover:bg-gray-50">
                                            <td className="px-5 py-4 font-medium text-gray-900">
                                                {[associate.firstName, associate.lastName].filter(Boolean).join(" ") || "—"}
                                                {associate.isCurrentUser && (
                                                    <span className="ml-2 text-xs font-normal text-gray-500">
                                                        {t("you")}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-gray-600">
                                                {associate.email || "—"}
                                            </td>
                                            <td className="px-5 py-4 text-sm">
                                                <div className="flex flex-wrap gap-1">
                                                    {associate.roles.map((role) => (
                                                        <span
                                                            key={`${role.assignmentType}:${role.roleKey}:${role.sourceKey ?? ""}`}
                                                            className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
                                                        >
                                                            {role.roleName}
                                                            {associate.assignmentType === "Both" && (
                                                                <span className="ml-1 text-gray-500">
                                                                    ({t(role.assignmentType.toLowerCase())})
                                                                </span>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                                {isEditing && (
                                                    <fieldset className="mt-3 space-y-2">
                                                        <legend className="sr-only">{t("roles")}</legend>
                                                        {(data?.roles ?? []).map((role) => (
                                                            <label key={role.key} className="flex items-center gap-2 text-sm">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedRoleKeys.includes(role.key)}
                                                                    disabled={
                                                                        !role.buyerAssignable &&
                                                                        !explicitRoles.includes(role.key)
                                                                    }
                                                                    onChange={(event) =>
                                                                        setSelectedRoleKeys((keys) =>
                                                                            event.target.checked
                                                                                ? [...keys, role.key]
                                                                                : keys.filter((key) => key !== role.key),
                                                                        )
                                                                    }
                                                                />
                                                                {role.name}
                                                            </label>
                                                        ))}
                                                        <div className="flex gap-3 pt-1">
                                                            <button
                                                                type="button"
                                                                disabled={saving || selectedRoleKeys.length === 0}
                                                                onClick={() => submitChange(associate.customerId, "PATCH")}
                                                                className="text-sm font-medium text-blue-600 disabled:opacity-50"
                                                            >
                                                                {t("save")}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={saving}
                                                                onClick={() => setEditingCustomerId(null)}
                                                                className="text-sm text-gray-600"
                                                            >
                                                                {t("cancel")}
                                                            </button>
                                                        </div>
                                                    </fieldset>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${assignmentBadgeClasses[associate.assignmentType]}`}>
                                                    {t(associate.assignmentType.toLowerCase())}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-sm whitespace-nowrap">
                                                {canEdit ? (
                                                    isEditing ? (
                                                        <button
                                                            type="button"
                                                            disabled={saving}
                                                            onClick={() => submitChange(associate.customerId, "DELETE")}
                                                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                        >
                                                            {t("remove")}
                                                        </button>
                                                    ) : (
                                                        <div className="flex gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedRoleKeys(explicitRoles);
                                                                    setEditingCustomerId(associate.customerId);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800"
                                                            >
                                                                {t("edit")}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={saving}
                                                                onClick={() => submitChange(associate.customerId, "DELETE")}
                                                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                            >
                                                                {t("remove")}
                                                            </button>
                                                        </div>
                                                    )
                                                ) : associate.assignmentType !== "Explicit" ? (
                                                    <span
                                                        title={t("inheritedTooltip")}
                                                        className="cursor-help text-gray-500"
                                                    >
                                                        {t("view")}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
