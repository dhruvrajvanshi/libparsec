var gulp       = require("gulp");
var typescript = require("gulp-typescript");
var babel      = require("gulp-babel");

var tsProject = typescript.createProject('tsconfig.json');

gulp.task('default', function(){
  return tsProject.src('index.ts')
    .pipe(tsProject()).js
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('build'))
})