import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  Project as ApiProject,
  ProjectPriority,
  ProjectService,
  ProjectStatus,
  ProjectTag as ApiProjectTag,
} from '../../core/services/project.service';

type Priority = 'Low' | 'Medium' | 'High';
type Tag = 'Testing' | 'Android' | 'iOS' | 'Web' | 'Backend' | 'Design';

interface Project {
  name: string;
  tag: Tag;
  description: string;
  created: string;
  teamLeader: string;
  priority: Priority;
  deadline: string;
  comments: number;
  bugs: number;
  team: { initials: string; bg: string; color: string }[];
  progress: number;
}

interface ProjectColumn {
  title: string;
  count: number;
  badgeBg: string;
  badgeColor: string;
  projects: Project[];
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss'],
})
export class ProjectsComponent implements OnInit {
  readonly modalOpen = signal<boolean>(false);
  readonly form: FormGroup;
  readonly availableTags: Tag[] = ['Testing', 'Android', 'iOS', 'Web', 'Backend', 'Design'];
  readonly availableColumns = ['New Projects', 'Running', 'Finished'];

  constructor(private fb: FormBuilder, private projectService: ProjectService) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      tag: ['Web', [Validators.required]],
      column: ['New Projects', [Validators.required]],
      description: ['', [Validators.required]],
      teamLeader: ['', [Validators.required]],
      priority: ['Medium', [Validators.required]],
      deadline: ['', [Validators.required]],
    });
  }

  readonly columns = signal<ProjectColumn[]>([
    { title: 'New Projects', count: 0, badgeBg: '#DCFCE7', badgeColor: '#15803D', projects: [] },
    { title: 'Running', count: 0, badgeBg: '#DBEAFE', badgeColor: '#1D4ED8', projects: [] },
    { title: 'Finished', count: 0, badgeBg: '#FEF3C7', badgeColor: '#B45309', projects: [] },
  ]);

  private makeProject(
    name: string,
    tag: Tag,
    description: string,
    teamLeader: string,
    created: string,
    priority: Priority,
    deadline: string,
    comments: number,
    bugs: number,
    progress: number,
  ): Project {
    const palette = [
      { bg: '#DBEAFE', color: '#1D4ED8' },
      { bg: '#FEE2E2', color: '#B91C1C' },
      { bg: '#DCFCE7', color: '#15803D' },
      { bg: '#FEF3C7', color: '#B45309' },
      { bg: '#F3E8FF', color: '#6B21A8' },
    ];
    const teamCount = 3 + (name.length % 3);
    const team = Array.from({ length: teamCount }, (_, i) => {
      const swatch = palette[(i + name.length) % palette.length];
      const initials = (name.split(' ')[0]?.[0] || 'A').toUpperCase() + String.fromCharCode(65 + ((i * 5) % 26));
      return { initials, bg: swatch.bg, color: swatch.color };
    });
    return { name, tag, description, created, teamLeader, priority, deadline, comments, bugs, team, progress };
  }

  ngOnInit(): void {
    this.fetchProjects();
  }

  private fetchProjects(): void {
    this.projectService.list().subscribe({
      next: (rows) => this.applyApiProjects(rows),
    });
  }

  private applyApiProjects(rows: ApiProject[]): void {
    const tagMap: Record<ApiProjectTag, Tag> = {
      web: 'Web', android: 'Android', ios: 'iOS', backend: 'Backend', testing: 'Testing', design: 'Design',
    };
    const priorityMap: Record<ProjectPriority, Priority> = { low: 'Low', medium: 'Medium', high: 'High' };
    const buckets: Record<ProjectStatus, ApiProject[]> = { new: [], running: [], finished: [], on_hold: [] };
    rows.forEach((r) => buckets[r.status]?.push(r));

    const fmt = (iso: string | null) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return isNaN(d.getTime()) ? iso : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    };

    const toProject = (r: ApiProject): Project => this.makeProject(
      r.name,
      tagMap[r.tag],
      r.description ?? '',
      r.team_leader,
      fmt(r.created_at),
      priorityMap[r.priority],
      fmt(r.deadline),
      r.comments_count,
      r.bugs_count,
      r.progress,
    );

    const next = this.columns().map((c) => {
      const status: ProjectStatus =
        c.title === 'New Projects' ? 'new' : c.title === 'Running' ? 'running' : 'finished';
      const apiList = buckets[status].map(toProject);
      return { ...c, projects: apiList, count: apiList.length };
    });
    this.columns.set(next);
  }

  openModal(): void {
    this.form.reset({
      name: '',
      tag: 'Web',
      column: 'New Projects',
      description: '',
      teamLeader: '',
      priority: 'Medium',
      deadline: '',
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  submitProject(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const status: ProjectStatus =
      v.column === 'New Projects' ? 'new' : v.column === 'Running' ? 'running' : 'finished';
    this.projectService
      .create({
        name: v.name,
        tag: (v.tag as string).toLowerCase() as ApiProjectTag,
        description: v.description,
        team_leader: v.teamLeader,
        priority: (v.priority as string).toLowerCase() as ProjectPriority,
        status,
        deadline: v.deadline,
        progress: 0,
        comments_count: 0,
        bugs_count: 0,
      })
      .subscribe({
        next: () => {
          this.fetchProjects();
          this.closeModal();
        },
        error: (err) => {
          console.error('Failed to create project', err);
          alert(err?.error?.detail || 'Failed to save project. Please try again.');
        },
      });
  }

  hasError(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  tagColor(tag: Tag): { bg: string; color: string } {
    const map: Record<Tag, { bg: string; color: string }> = {
      Testing: { bg: '#FCE7F3', color: '#BE185D' },
      Android: { bg: '#DCFCE7', color: '#15803D' },
      iOS: { bg: '#DBEAFE', color: '#1D4ED8' },
      Web: { bg: '#E0E7FF', color: '#4338CA' },
      Backend: { bg: '#F3E8FF', color: '#6B21A8' },
      Design: { bg: '#FFEDD5', color: '#C2410C' },
    };
    return map[tag];
  }
}
