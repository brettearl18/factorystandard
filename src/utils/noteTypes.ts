import { CheckCircle, AlertCircle, Flag, TrendingUp, Info } from "lucide-react";
import type { NoteType } from "@/types/guitars";

export function getNoteTypeLabel(type?: NoteType): string {
  switch (type) {
    case "milestone":
      return "Milestone";
    case "quality_check":
      return "Quality Check";
    case "issue":
      return "Issue";
    case "status_change":
      return "Status Change";
    case "general":
      return "General";
    case "update":
    default:
      return "Update";
  }
}

export function getNoteTypeIcon(type?: NoteType) {
  switch (type) {
    case "milestone":
      return CheckCircle;
    case "quality_check":
      return Flag;
    case "issue":
      return AlertCircle;
    case "status_change":
      return TrendingUp;
    case "general":
      return Info;
    case "update":
    default:
      return Info;
  }
}

export function getNoteTypeColor(type?: NoteType): string {
  switch (type) {
    case "milestone":
      return "bg-green-100 text-green-700 border-green-200";
    case "quality_check":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "issue":
      return "bg-red-100 text-red-700 border-red-200";
    case "status_change":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "general":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "update":
    default:
      return "bg-blue-100 text-blue-700 border-blue-200";
  }
}

