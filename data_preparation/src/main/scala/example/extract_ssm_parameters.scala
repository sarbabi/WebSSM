package com.example

import java.io._
import scalismo.io.{StatisticalModelIO}

object extract_ssm_parameters{
  def main(args: Array[String]): Unit = {
    scalismo.initialize()

    /**
     *  Adjust the value for "modelPath" variable, according to the name of your shape model (.h5) file
     *  everything else can remain the same
     *  if your shape model is too big for the web app to load, some resampling can be done
     * */

    val data_dir = "data\\"
    val results_dir = "results\\"
    val modelPath = data_dir+"talus.h5"

    println("reading shape model: "+modelPath)

    val ssm = StatisticalModelIO.readStatisticalTriangleMeshModel3D(new File(modelPath)).get
    val stddev = ssm.gp.variance.map(x => math.sqrt(x))
    val basisMatrix = ssm.gp.basisMatrix
    val meanVector = ssm.gp.meanVector
    val meanShape = ssm.mean

    println("exporting standard deviation matrix: "+results_dir+"stddev.csv")
    breeze.linalg.csvwrite(new File(results_dir+"stddev.csv"), stddev.toDenseMatrix, separator = ',')

    println("exporting basis matrix: "+results_dir+"basisMatrix.csv")
    breeze.linalg.csvwrite(new File(results_dir+"basisMatrix.csv"), basisMatrix, separator = ',')

    println("exporting mean vector: "+results_dir+"meanVector.csv")
    breeze.linalg.csvwrite(new File(results_dir+"meanVector.csv"), meanVector.toDenseMatrix, separator = ',')

    val meanShapePointsIterator = meanShape.pointSet.points.zipWithIndex.map{case(p, i) => (p.x, p.y, p.z)}
    var result = ""
    while(meanShapePointsIterator.hasNext){
      val next = meanShapePointsIterator.next()
      result = result + next._1 + ","+ next._2 + "," + next._3 + "\n"
    }
    println("exporting mean shape: "+results_dir+"meanShape.csv")
    val meanShapeFilepath = results_dir+"meanShape.csv"
    val outputFile = new File(meanShapeFilepath)
    val bw = new BufferedWriter(new FileWriter(outputFile))
    bw.write(result)
    bw.close()

    println("all export done! access files in: "+results_dir)
  }
}
