import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from 'react-router-dom'
import { FileText, Clock, BarChart3, Users, ArrowRight } from 'lucide-react'

const actions = [
  { title: "New Request", icon: FileText, href: "/new-request", color: "bg-blue-500", description: "Create funding request" },
  { title: "Pending Approvals", icon: Clock, href: "/approvals", color: "bg-yellow-500", description: "Review pending items" },
  { title: "View Reports", icon: BarChart3, href: "/reports", color: "bg-green-500", description: "Analytics & insights" },
  { title: "Team Requests", icon: Users, href: "/requests", color: "bg-purple-500", description: "View team activity" }
]

export function QuickActions() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link key={action.title} to={action.href}>
            <Card className="hover:shadow-lg transition-all cursor-pointer group hover:border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`${action.color} w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
