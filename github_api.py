"""
Thin wrapper around the GitHub REST API for Issues -- the human approval
surface for Step 6's change proposals. Uses GITHUB_TOKEN from the
environment (automatically provided by GitHub Actions to every workflow
run; unset locally, which GitHubClient.__init__ surfaces as a clear error
rather than a confusing 401).
"""
import os

import requests

API_BASE = "https://api.github.com"


class GitHubError(RuntimeError):
    pass


class GitHubClient:
    def __init__(self, repo):
        self.repo = repo
        self.token = os.environ.get("GITHUB_TOKEN")
        if not self.token:
            raise GitHubError(
                "GITHUB_TOKEN is not set. This is provided automatically inside GitHub "
                "Actions (needs 'permissions: issues: write' in the workflow) -- locally, "
                "the GitHub Issues part of the approval workflow can't be exercised; "
                "that's expected, verify it via a real Actions run instead."
            )
        self._headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
        }

    def _url(self, path):
        return f"{API_BASE}/repos/{self.repo}{path}"

    def create_issue(self, title, body, labels):
        resp = requests.post(self._url("/issues"), headers=self._headers,
                              json={"title": title, "body": body, "labels": labels})
        if resp.status_code not in (200, 201):
            raise GitHubError(f"create_issue failed (HTTP {resp.status_code}): {resp.text}")
        return resp.json()

    def get_issue(self, issue_number):
        resp = requests.get(self._url(f"/issues/{issue_number}"), headers=self._headers)
        if resp.status_code != 200:
            raise GitHubError(f"get_issue failed (HTTP {resp.status_code}): {resp.text}")
        return resp.json()

    def comment_on_issue(self, issue_number, body):
        resp = requests.post(self._url(f"/issues/{issue_number}/comments"), headers=self._headers,
                              json={"body": body})
        if resp.status_code not in (200, 201):
            raise GitHubError(f"comment_on_issue failed (HTTP {resp.status_code}): {resp.text}")
        return resp.json()

    def add_labels(self, issue_number, labels):
        resp = requests.post(self._url(f"/issues/{issue_number}/labels"), headers=self._headers,
                              json={"labels": labels})
        if resp.status_code not in (200, 201):
            raise GitHubError(f"add_labels failed (HTTP {resp.status_code}): {resp.text}")
        return resp.json()

    def close_issue(self, issue_number):
        resp = requests.patch(self._url(f"/issues/{issue_number}"), headers=self._headers,
                               json={"state": "closed"})
        if resp.status_code != 200:
            raise GitHubError(f"close_issue failed (HTTP {resp.status_code}): {resp.text}")
        return resp.json()
