import vtk
import numpy as np
from vtk.util.misc import vtkGetDataRoot
from datetime import datetime
VTK_DATA_ROOT = vtkGetDataRoot()

class ReconstructSurface:
    def __init__(self):
        self.pts = ""
        self.cntr_nr = 0
        self.pointSource = vtk.vtkProgrammableSource()
        self.pointSource.SetExecuteMethod(self.readPoints)

    def readPoints(self):
        output = self.pointSource.GetPolyDataOutput()
        points = vtk.vtkPoints()
        output.SetPoints(points)
        for i in np.arange(0, len(self.pts) - 1, 3):
            x, y, z = float(self.pts[i]), float(self.pts[i + 1]), float(self.pts[i + 2])
            points.InsertNextPoint(x,y,z)

    def reconstruct(self):
        # Read some points. Use a programmable filter to read them.
        # Construct the surface and create isosurface.
        surf = vtk.vtkSurfaceReconstructionFilter()
        surf.SetSampleSpacing(1)
        surf.SetInputConnection(self.pointSource.GetOutputPort())

        cf = vtk.vtkContourFilter()
        cf.SetInputConnection(surf.GetOutputPort())
        cf.SetValue(0, 0.0)

        # Sometimes the contouring algorithm can create a volume whose gradient
        # vector and ordering of polygon (using the right hand rule) are
        # inconsistent. vtkReverseSense cures this problem.
        reverse = vtk.vtkReverseSense()
        reverse.SetInputConnection(cf.GetOutputPort())
        reverse.ReverseCellsOn()
        reverse.ReverseNormalsOn()

        map = vtk.vtkPolyDataMapper()
        map.SetInputConnection(reverse.GetOutputPort())
        map.ScalarVisibilityOff()

        surfaceActor = vtk.vtkActor()
        surfaceActor.SetMapper(map)
        surfaceActor.GetProperty().SetDiffuseColor(1.0000, 0.3882, 0.2784)
        surfaceActor.GetProperty().SetSpecularColor(1, 1, 1)
        surfaceActor.GetProperty().SetSpecular(.4)
        surfaceActor.GetProperty().SetSpecularPower(50)

        # Create the RenderWindow, Renderer and both Actors
        ren = vtk.vtkRenderer()
        renWin = vtk.vtkRenderWindow()
        renWin.AddRenderer(ren)
        iren = vtk.vtkRenderWindowInteractor()
        iren.SetRenderWindow(renWin)

        # Add the actors to the renderer, set the background and size
        ren.AddActor(surfaceActor)
        ren.SetBackground(1, 1, 1)
        renWin.SetSize(400, 400)
        ren.GetActiveCamera().SetFocalPoint(0, 0, 0)
        ren.GetActiveCamera().SetPosition(1, 0, 0)
        ren.GetActiveCamera().SetViewUp(0, 0, 1)
        ren.ResetCamera()
        ren.GetActiveCamera().Azimuth(20)
        ren.GetActiveCamera().Elevation(30)
        ren.GetActiveCamera().Dolly(1.2)
        ren.ResetCameraClippingRange()

        return cf