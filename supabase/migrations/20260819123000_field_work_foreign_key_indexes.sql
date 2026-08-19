-- Cover field-work foreign keys used by assignment, audit, and confirmation lookups.
create index field_assignments_project_idx on public.field_assignments (project_id);
create index field_assignments_assigned_by_idx on public.field_assignments (assigned_by_user_id);
create index field_assignment_events_actor_idx on public.field_assignment_events (actor_user_id);
create index installation_confirmations_site_idx on public.installation_confirmations (site_id);
create index installation_confirmations_project_idx on public.installation_confirmations (project_id);
create index installation_confirmations_tech_idx on public.installation_confirmations (tech_user_id, confirmed_at desc);
create index installation_lines_outbound_line_idx on public.installation_lines (outbound_line_id) where outbound_line_id is not null;
create index installation_photos_photo_idx on public.installation_photos (photo_id);
