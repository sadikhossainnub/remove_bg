const express = require('express');
const router  = express.Router();

// In-memory store
const jobs = {};
const jobsList = [];

function recordJob(jobData) {
  jobs[jobData.id] = jobData;
  jobsList.unshift(jobData);
  if (jobsList.length > 500) jobsList.pop();
}

router.get('/', (req, res) => {
  return res.json({ jobs: jobsList.slice(0, 50) });
});

router.get('/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  return res.json(job);
});

module.exports = router;
module.exports.jobs = jobs;
module.exports.jobsList = jobsList;
module.exports.recordJob = recordJob;
