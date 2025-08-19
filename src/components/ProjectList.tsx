const handleEditProject = (project: Project) => {
  if (props.onEditProject) {
    props.onEditProject(project);
  } else {
    setEditingProject(project);
  }
};

const handleDetailsProject = (project: Project) => {
  // TODO: Implement details functionality
};