/*
  * Copyright 2012-2018 the original author or authors.
  *
  * Licensed under the Apache License, Version 2.0 (the "License");
  * you may not use this file except in compliance with the License.
  * You may obtain a copy of the License at
  *
  *      http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
  */
  
var jenkins_host = WIDGET_CONFIG_JENKINS_URL + "/jenkins/";
var api_query = "api/json?tree=jobs[name,lastBuild[timestamp],scm],views[url]";
var data = {};
var bound = new Date();
var bound_timestamp;
var typeToFilter = "";

function run() {
  data.total = 0;
  data.active = 0;
  data.activeTypeToFilter = 0;
  data.allJobs = [];
  data.svn = 0;
  data.git = 0;
  data.typeToFilter = "";
  
  if (SURI_PERIOD) {
    if (SURI_PERIOD == "Day") {
      bound.setDate(bound.getDate() - 1 * SURI_NB_PERIOD);
    } else if (SURI_PERIOD == "Week") {
      bound.setDate(bound.getDate() - 7 * SURI_NB_PERIOD);
    } else if (SURI_PERIOD == "Month") {
      bound.setMonth(bound.getMonth() - 1 * SURI_NB_PERIOD);
    } else if (SURI_PERIOD == "Year") {
      bound.setFullYear(bound.getFullYear() - 1 * SURI_NB_PERIOD);
    }
  }
  
  bound_timestamp = bound.getTime();
  if (SURI_JOB_TYPE == "All") {
    typeToFilter = null
  }
  
  var view = "";
  if (SURI_VIEW != null) {
    view = SURI_VIEW.replace(jenkins_host, "").replace("//", "/");
    if (view.indexOf("/") == 0) {
      view = view.substring(1, view.length - 1);
    }
    if (view.lastIndexOf("/") != view.length - 1) {
      view = view + "/"
    }
  }
  
  data.view = view;
  data.viewDisplay = view.replace(new RegExp("view/", 'g'), "").replace(new RegExp("/$", 'g'), "");
  getContent(jenkins_host + view + api_query);
  data.ok = true;
  data.total = data.allJobs.length;
  
  if (typeToFilter) {
    data.activeToDisplay = data.activeTypeToFilter;
    data.totalToDisplay = data.active
    data.typeToFilter = "Generic";
  } else {
    data.activeToDisplay = data.active;
    data.totalToDisplay = data.total
  }
    
  if (SURI_JOB_SCM_TYPE) {
	if (SURI_JOB_SCM_TYPE === 'All' || SURI_JOB_SCM_TYPE === 'Git') {
		data.displayGit = true;
	}
	
	if (SURI_JOB_SCM_TYPE === 'All' || SURI_JOB_SCM_TYPE === 'SVN') {
		data.displaySVN = true;
	}
  }
  
  data.scm = data.git + data.svn;
  data.gitPercent = Math.round((data.git / data.scm) * 100);
  data.svnPercent = Math.round((data.svn / data.scm) * 100);
  data.period = SURI_PERIOD.toLowerCase();
  
  return JSON.stringify(data);
}

function getContent(url) {
  var jsonResponse_jobs = Packages.get(url);
  if (jsonResponse_jobs == null) {
    return null;
  }
  
  var jsonObject_jobs = JSON.parse(jsonResponse_jobs);
  if (SURI_VIEW != null && jsonObject_jobs.views != undefined) {
    for (var i in jsonObject_jobs.views) {
      getContent(jsonObject_jobs.views[i].url + api_query);
    }
  }

  for (var j in jsonObject_jobs.jobs) {
    //to get right value for data.total for views because if we work with a view some jobs can belong to different sub-views
    if (data.allJobs.indexOf(jsonObject_jobs.jobs[j].name) < 0) {
      data.allJobs.push(jsonObject_jobs.jobs[j].name);
      if (jsonObject_jobs.jobs[j].lastBuild != null && jsonObject_jobs.jobs[j].lastBuild.timestamp > bound_timestamp) {
        data.active++;
        if (typeToFilter && jsonObject_jobs.jobs[j].name.indexOf(typeToFilter) > -1) {
          // With filter (example : Check if git or svn is used for only generic jobs)
          data.activeTypeToFilter++;
          if (jsonObject_jobs.jobs[j].scm != null && jsonObject_jobs.jobs[j].scm._class == "hudson.scm.SubversionSCM") {
            data.svn++
          } else if (jsonObject_jobs.jobs[j].scm != null && jsonObject_jobs.jobs[j].scm._class == "hudson.plugins.git.GitSCM") {
            data.git++
          }
        } else if (!typeToFilter) {
          //no filter on job type (generic jobs for example)
          if (jsonObject_jobs.jobs[j].scm != null && jsonObject_jobs.jobs[j].scm._class == "hudson.scm.SubversionSCM") {
            data.svn++
          } else if (jsonObject_jobs.jobs[j].scm != null && jsonObject_jobs.jobs[j].scm._class == "hudson.plugins.git.GitSCM") {
            data.git++
          }
        }
      }
    }
  }
}