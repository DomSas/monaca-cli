(function() {
  'use strict';

  var read = require('read'),
    path = require('path'),
    Q = require('q'),
    Monaca = require('monaca-lib').Monaca;

  var util = require(path.join(__dirname, 'util'));
    
  var monaca = new Monaca();

  var BaseTask = require('./task').BaseTask;

  var SyncTask = function(){};

  SyncTask.prototype = new BaseTask();

  SyncTask.prototype.taskList = ['upload', 'download', 'clone'];

  SyncTask.prototype.run = function(taskName){
    var self = this;

    if (!this.isMyTask(taskName)) 
      return;

    monaca.relogin().then(
      function() {
        if (taskName == 'upload') {
          self.upload();
        }
        else if (taskName == 'download') {
          self.download();
        }
        else {
          self.clone();
        }
      },
      function() {
        util.err('Must be signed in to use this command.')
        util.print('Please sign in with \'monaca login\' to sign in.');
      }
    );
  };

  SyncTask.prototype.upload = function() {
    util.print('This operation will overwrite all remote changes that has been made.'.warn);
    read({ prompt: 'Do you want to continue? (y/N) ' }, function(error, answer) {
      if (error || answer !== 'y') {
        util.print('Aborting operation.');
        process.exit(1);
      }

      var nbrOfFiles = 0;

      monaca.uploadProject(process.cwd()).then(
        function() {
          if (nbrOfFiles === 0) {
            util.print('No files uploaded since project is already in sync.');
          }
          else {
            util.print('Project successfully uploaded to Monaca Cloud!');
          }
        },
        function(error) {
          util.err('Upload failed: ' + error);
        },
        function(progress) {
          var per = 100 * (progress.index + 1) / progress.total;
          per = per.toString().substr(0, 5) + '%';
          console.log(('[' + per + '] ').verbose + progress.path);

          nbrOfFiles++;
        }
      );
    })
  };

  SyncTask.prototype.download = function() {
    util.print('This operation will overwrite all local changes you have made.'.warn);
    read({ prompt: 'Do you want to continue? (y/N) ' }, function(error, answer) {
      if (error || answer !== 'y') {
        util.print('Aborting operation.');
        process.exit(1);
      }

      var nbrOfFiles = 0;

      monaca.downloadProject(process.cwd()).then(
        function() {
          if (nbrOfFiles === 0) {
            util.print('No files downloaded since project is already in sync.');
          }
          else {
            util.print('Project successfully downloaded from Monaca Cloud!');
          }
        },
        function(error) {
          util.err('Download failed: ' + error);
        },
        function(progress) {
          var per = 100 * (progress.index + 1) / progress.total;
          per = per.toString().substr(0, 5) + '%';
          console.log(('[' + per + '] ').verbose + progress.path);

          nbrOfFiles++;
        }
      );
    });
  };

  SyncTask.prototype.clone = function() {
    util.print('Fetching project list...');

    monaca.getProjects().then(
      function(projects) {
        util.print('Please choose one of the following projects:\n');

        for (var i = 0, l = projects.length; i < l; i ++) {
          var project = projects[i];

          util.print('\t' + (i + 1) + '. ' + project.name);
        }
  
        util.print('');

        read( { prompt: 'Project number: ' }, function(error, idx) {
          if (error) {
            util.error('Unable to read project number.');
          }
          else {
            var projectId = parseInt(idx);  

            if (projectId > 0 && projectId <= projects.length) {
              var project = projects[projectId-1];

              read( { prompt: 'Destination directory: ' }, function(error, destPath) {
                if (error) {
                  util.error('Unable to read destination directory.');
                }
                else {
                  monaca.cloneProject(project.projectId, destPath).then(
                    function() {
                      util.print('Project successfully clone from Monaca Cloud!');
                    },
                    function(error) {
                      util.err('Clone failed: ' + error);
                    },
                    function(progress) {
                      var per = 100 * (progress.index + 1) / progress.total;
                      per = per.toString().substr(0, 5) + '%';
                      console.log(('[' + per + '] ').verbose + progress.path);
                    }
                  );
                }
              });
            }
            else {
              util.err('Invalid project number.');
            }
          }
        });

      },
      function(error) {
        util.err('Unable to fetch project list: ' + error);
      }
    );
  };
    
  exports.SyncTask = SyncTask;
})();