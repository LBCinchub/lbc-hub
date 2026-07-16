import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Briefcase, Clock, DollarSign, ArrowRight, Plus, Star
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from '@tanstack/react-query';

const categories = ['all', 'technology', 'design', 'marketing', 'finance', 'healthcare', 'education', 'engineering', 'sales', 'other'];
const jobTypes = ['all', 'full-time', 'part-time', 'freelance', 'contract', 'remote'];

const typeColors = {
  'full-time': 'bg-indigo-100 text-indigo-700',
  'part-time': 'bg-purple-100 text-purple-700',
  'freelance': 'bg-amber-100 text-amber-700',
  'contract': 'bg-sky-100 text-sky-700',
  'remote': 'bg-emerald-100 text-emerald-700',
};

const categoryIcons = {
  technology: '💻', design: '🎨', marketing: '📣', finance: '📊',
  healthcare: '🏥', education: '📚', engineering: '⚙️', sales: '🤝', other: '💼'
};

const demoJobs = [
  { id: 1, title: 'Senior Frontend Developer', company: 'TechCorp', location: 'Remote', category: 'technology', type: 'remote', salary_range: '$90k–$130k', description: 'Build beautiful, performant web apps with React and modern tooling.', is_featured: true },
  { id: 2, title: 'Brand Designer', company: 'Creative Studio', location: 'New York, NY', category: 'design', type: 'full-time', salary_range: '$70k–$95k', description: 'Shape the visual identity of fast-growing brands.', is_featured: false },
  { id: 3, title: 'Growth Marketing Lead', company: 'StartupXYZ', location: 'Austin, TX', category: 'marketing', type: 'full-time', salary_range: '$80k–$110k', description: 'Drive user acquisition and retention across all channels.', is_featured: true },
  { id: 4, title: 'Financial Analyst', company: 'FinGroup', location: 'Chicago, IL', category: 'finance', type: 'contract', salary_range: '$65k–$85k', description: 'Analyze market trends and prepare investment reports.', is_featured: false },
  { id: 5, title: 'Freelance Copywriter', company: 'ContentHub', location: 'Remote', category: 'marketing', type: 'freelance', salary_range: '$50–$80/hr', description: 'Craft compelling copy for digital campaigns and websites.', is_featured: false },
  { id: 6, title: 'Backend Engineer', company: 'DataFlow', location: 'San Francisco, CA', category: 'engineering', type: 'full-time', salary_range: '$110k–$150k', description: 'Build scalable APIs and data pipelines at high scale.', is_featured: true },
];

function PostJobDialog({ onSuccess }) {
  const [form, setForm] = useState({ title: '', company: '', location: '', category: 'technology', type: 'full-time', salary_range: '', description: '' });
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setOpen(false);
      setForm({ title: '', company: '', location: '', category: 'technology', type: 'full-time', salary_range: '', description: '' });
    },
    onError: () => {
      alert('Failed to post job. Please try again.');
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-primary rounded-full px-6 py-3 text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Post a Job
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Post a New Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {[['title', 'Job Title'], ['company', 'Company Name'], ['location', 'Location'], ['salary_range', 'Salary Range (e.g. $80k–$100k)']].map(([field, label]) => (
            <div key={field}>
              <Label className="text-zinc-300 mb-1 block">{label}</Label>
              <Input
                value={form[field]}
                onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                placeholder={label}
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-300 mb-1 block">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  {categories.filter(c => c !== 'all').map(c => (
                    <SelectItem key={c} value={c}>{categoryIcons[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-300 mb-1 block">Job Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  {jobTypes.filter(t => t !== 'all').map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-zinc-300 mb-1 block">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 min-h-[100px]"
              placeholder="Describe the role..."
            />
          </div>
          <Button
            onClick={() => createMutation.mutate(form)}
            disabled={!form.title || !form.company || createMutation.isPending}
            className="w-full btn-primary rounded-xl h-12"
          >
            {createMutation.isPending ? 'Posting...' : 'Post Job'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Jobs() {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('all');
  const [jobType, setJobType] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);

  const { data: dbJobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 50),
  });

  const allJobs = dbJobs.length > 0 ? dbJobs : demoJobs;

  const filtered = allJobs.filter(job => {
    const matchSearch = !search || job.title?.toLowerCase().includes(search.toLowerCase()) || job.company?.toLowerCase().includes(search.toLowerCase());
    const matchLocation = !location || job.location?.toLowerCase().includes(location.toLowerCase());
    const matchCategory = category === 'all' || job.category === category;
    const matchType = jobType === 'all' || job.type === jobType;
    return matchSearch && matchLocation && matchCategory && matchType;
  });

  const featured = filtered.filter(j => j.is_featured);
  const regular = filtered.filter(j => !j.is_featured);

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-4xl font-bold mb-2">Job Board</h1>
              <p className="text-zinc-400">Find your next opportunity or post a role for the community</p>
            </div>
            <PostJobDialog />
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 mb-8 space-y-4"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Job title or company" className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-11 rounded-xl" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location or Remote" className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-11 rounded-xl" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c === 'all' ? '📋 All Categories' : `${categoryIcons[c]} ${c.charAt(0).toUpperCase() + c.slice(1)}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl">
                <SelectValue placeholder="Job Type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {jobTypes.map(t => (
                  <SelectItem key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>{filtered.length} job{filtered.length !== 1 ? 's' : ''} found</span>
            <button onClick={() => { setSearch(''); setLocation(''); setCategory('all'); setJobType('all'); }} className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Clear filters
            </button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Job List */}
          <div className="lg:col-span-2 space-y-4">
            {featured.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Featured
                </h2>
                {featured.map((job, i) => <JobCard key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} index={i} featured />)}
              </div>
            )}

            {regular.length > 0 && (
              <div className="space-y-3">
                {featured.length > 0 && <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mt-4">All Jobs</h2>}
                {regular.map((job, i) => <JobCard key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} index={i} />)}
              </div>
            )}

            {filtered.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-16 text-center">
                <Briefcase className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
                <p className="text-zinc-400">Try adjusting your filters or be the first to post a job!</p>
              </motion.div>
            )}
          </div>

          {/* Job Detail Panel */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedJob ? (
                <motion.div key={selectedJob.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="glass rounded-2xl p-6 sticky top-24">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-2xl">
                      {categoryIcons[selectedJob.category]}
                    </div>
                    {selectedJob.is_featured && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Star className="w-3 h-3 mr-1 fill-amber-400" /> Featured
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-bold mb-1">{selectedJob.title}</h2>
                  <p className="text-indigo-400 font-medium mb-4">{selectedJob.company}</p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="w-4 h-4" /> {selectedJob.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Clock className="w-4 h-4" />
                      <Badge className={`${typeColors[selectedJob.type]} border-0 text-xs`}>
                        {selectedJob.type}
                      </Badge>
                    </div>
                    {selectedJob.salary_range && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <DollarSign className="w-4 h-4" /> {selectedJob.salary_range}
                      </div>
                    )}
                  </div>
                  {selectedJob.description && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2 text-sm uppercase tracking-wider text-zinc-400">About the Role</h3>
                      <p className="text-zinc-300 text-sm leading-relaxed">{selectedJob.description}</p>
                    </div>
                  )}
                  <Button className="w-full btn-primary rounded-xl h-12 font-semibold">
                    Apply Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 text-center sticky top-24">
                  <Briefcase className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                  <p className="text-zinc-400 text-sm">Select a job to see details</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, selected, onClick, index, featured }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className={`glass rounded-xl p-5 cursor-pointer transition-all duration-200 border ${
        selected ? 'border-indigo-500/60 bg-indigo-500/5' : 'border-white/5 hover:border-white/20'
      } ${featured ? 'relative overflow-hidden' : ''}`}
    >
      {featured && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-l-xl" />}
      <div className="flex items-start gap-4 pl-1">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xl flex-shrink-0">
          {categoryIcons[job.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold truncate">{job.title}</h3>
            <Badge className={`${typeColors[job.type]} border-0 text-xs whitespace-nowrap flex-shrink-0`}>
              {job.type}
            </Badge>
          </div>
          <p className="text-sm text-indigo-400 font-medium mb-2">{job.company}</p>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
            {job.salary_range && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary_range}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}