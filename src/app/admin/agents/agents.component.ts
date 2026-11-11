import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../chat/services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-agents',
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.scss'],
  standalone: false
})
export class AgentsComponent implements OnInit {
  agents: any[] = [];
  selectedAgent: any = null;
  selectedRuns: any[] = [];
  isLoading = true;
  isRunsLoading = false;

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents(): void {
    this.isLoading = true;
    this.adminService.listAgents().subscribe({
      next: (agents) => {
        this.agents = agents;
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load agents');
        this.isLoading = false;
      }
    });
  }

  selectAgent(agent: any): void {
    this.selectedAgent = agent;
    this.loadRuns(agent.agentId || agent.agent_id);
  }

  closeDetail(): void {
    this.selectedAgent = null;
    this.selectedRuns = [];
  }

  loadRuns(agentId: number): void {
    this.isRunsLoading = true;
    this.adminService.getAgentRuns(agentId).subscribe({
      next: (runs) => {
        this.selectedRuns = runs;
        this.isRunsLoading = false;
      },
      error: () => {
        this.selectedRuns = [];
        this.isRunsLoading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'ok': case 'success': return 'status-active';
      case 'error': case 'failed': return 'status-inactive';
      case 'running': return 'status-pending';
      default: return '';
    }
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return 'never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
