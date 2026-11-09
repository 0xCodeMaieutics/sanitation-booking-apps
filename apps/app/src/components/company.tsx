"use client"

import { type ReactNode, createContext, use } from "react"

type CompanyRef = { slug: string; name: string }

const CompanyContext = createContext<CompanyRef | null>(null)

export function CompanyProvider({ company, children }: { company: CompanyRef; children: ReactNode }) {
  return <CompanyContext value={company}>{children}</CompanyContext>
}

/** The Company whose Booking Link the Client is on. */
export function useCompany(): CompanyRef {
  const company = use(CompanyContext)
  if (company === null) throw new Error("useCompany needs a CompanyProvider")
  return company
}
